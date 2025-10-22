import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Suspense, useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Group } from 'three';

interface StageModelProps {
  stageUrl: string;
}

function SingleStageAsset({ url }: { url: string }) {
  const gltf = useGLTF(url);
  return <primitive object={gltf.scene} />;
}

function StageModel({ stageUrl }: StageModelProps) {
  const [modelUrls, setModelUrls] = useState<string[]>([]);

  useEffect(() => {
    // Load Rioh Snowfield s03a_ib1 area
    const sampleModels = [
      `${stageUrl}/s03a_ib1/lndmd/s03a_ib1_m.glb`,
    ];
    setModelUrls(sampleModels);
  }, [stageUrl]);

  return (
    <group>
      {/* Load stage models */}
      {modelUrls.map((url, index) => (
        <Suspense key={url} fallback={null}>
          <SingleStageAsset url={url} />
        </Suspense>
      ))}
    </group>
  );
}

interface EnemyProps {
  url: string;
  position: [number, number, number];
}

function Enemy({ url, position }: EnemyProps) {
  const group = useRef<Group>(null);
  const gltf = useGLTF(url);

  return (
    <group ref={group} position={position}>
      <primitive object={gltf.scene} scale={1.5} />
    </group>
  );
}

interface PlayerCharacterProps {
  characterUrl: string;
  textureUrl?: string;
  animationsUrl?: string;
  position: THREE.Vector3;
  rotationRef: { current: number };
  currentAnimation: string;
  onAnimationEnd: () => void;
}

function PlayerCharacter({
  characterUrl,
  textureUrl,
  animationsUrl,
  position,
  rotationRef,
  currentAnimation,
  onAnimationEnd,
}: PlayerCharacterProps) {
  const group = useRef<Group>(null);
  const gltf = useGLTF(characterUrl);

  // Load external animations if provided
  const animGltf = animationsUrl ? useGLTF(animationsUrl) : null;
  const animationsToUse = animGltf?.animations || gltf.animations;
  const { actions, mixer } = useAnimations(animationsToUse, group);

  const previousAnimation = useRef<string>('');

  // Apply texture when available
  useEffect(() => {
    if (!textureUrl || !gltf.scene) return;

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      textureUrl,
      (texture) => {
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.flipY = false;
        texture.colorSpace = THREE.SRGBColorSpace;

        gltf.scene.traverse((child: any) => {
          if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat: any) => {
                mat.map = texture;
                mat.needsUpdate = true;
              });
            } else {
              child.material.map = texture;
              child.material.needsUpdate = true;
            }
          }
        });
      },
      undefined,
      (error) => {
        console.error('Error loading texture:', textureUrl, error);
      }
    );
  }, [textureUrl, gltf.scene]);

  // Handle animation changes
  useEffect(() => {
    if (currentAnimation === previousAnimation.current) return;

    const action = actions[currentAnimation];
    if (!action) {
      console.warn(`Animation ${currentAnimation} not found`);
      return;
    }

    // Stop previous animation
    if (previousAnimation.current && actions[previousAnimation.current]) {
      actions[previousAnimation.current]?.fadeOut(0.1);
    }

    // Play new animation
    action.reset().fadeIn(0.1);

    // Set loop based on animation type
    if (currentAnimation.includes('atk')) {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
    }

    action.play();

    previousAnimation.current = currentAnimation;
  }, [currentAnimation, actions]);

  // Listen for animation finished events
  useEffect(() => {
    if (!mixer) return;

    const handleFinished = (e: any) => {
      if (e.action === actions[currentAnimation]) {
        onAnimationEnd();
      }
    };

    mixer.addEventListener('finished', handleFinished);
    return () => {
      mixer.removeEventListener('finished', handleFinished);
    };
  }, [mixer, actions, currentAnimation, onAnimationEnd]);

  // Update position and rotation
  useFrame(() => {
    if (group.current) {
      group.current.position.copy(position);
      group.current.rotation.y = rotationRef.current;
    }
  });

  return (
    <group ref={group}>
      <primitive object={gltf.scene} />
    </group>
  );
}

interface OverShoulderControlsProps {
  playerPosition: THREE.Vector3;
  playerRotation: { current: number };
  onMove: (direction: { forward: number; strafe: number }) => void;
  onAttack: () => void;
  disabled: boolean;
}

function OverShoulderControls({
  playerPosition,
  playerRotation,
  onMove,
  onAttack,
  disabled,
}: OverShoulderControlsProps) {
  const { camera } = useThree();
  const moveSpeed = 0.08;
  const mouseSensitivity = 0.002;

  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  const cameraAngle = useRef({ horizontal: 0, vertical: 0.3 });
  const mouseMovement = useRef({ x: 0, y: 0 });
  const isPointerLocked = useRef(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (disabled) return;

      switch (event.code) {
        case 'KeyW':
          keys.current.forward = true;
          break;
        case 'KeyS':
          keys.current.backward = true;
          break;
        case 'KeyA':
          keys.current.left = true;
          break;
        case 'KeyD':
          keys.current.right = true;
          break;
        case 'Escape':
          // Exit pointer lock on escape
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
          keys.current.forward = false;
          break;
        case 'KeyS':
          keys.current.backward = false;
          break;
        case 'KeyA':
          keys.current.left = false;
          break;
        case 'KeyD':
          keys.current.right = false;
          break;
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      // Only capture mouse movement when pointer is locked
      if (isPointerLocked.current) {
        mouseMovement.current.x += event.movementX;
        mouseMovement.current.y += event.movementY;
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (disabled) return;
      if (event.button === 0 && isPointerLocked.current) {
        onAttack();
      }
    };

    // Request pointer lock on click
    const handleClick = () => {
      if (!isPointerLocked.current) {
        document.body.requestPointerLock();
      }
    };

    const handlePointerLockChange = () => {
      isPointerLocked.current = document.pointerLockElement === document.body;
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('click', handleClick);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, [onAttack, disabled]);

  useFrame(() => {
    // Update camera angle from mouse movement
    cameraAngle.current.horizontal -= mouseMovement.current.x * mouseSensitivity;
    cameraAngle.current.vertical -= mouseMovement.current.y * mouseSensitivity;

    // Clamp vertical angle
    cameraAngle.current.vertical = Math.max(-Math.PI / 6, Math.min(Math.PI / 3, cameraAngle.current.vertical));

    // Reset mouse movement
    mouseMovement.current.x = 0;
    mouseMovement.current.y = 0;

    // Calculate movement direction relative to camera
    let moveForward = 0;
    let moveStrafe = 0;

    if (keys.current.forward) moveForward = 1;
    if (keys.current.backward) moveForward = -1;
    if (keys.current.left) moveStrafe = 1;
    if (keys.current.right) moveStrafe = -1;

    // Notify parent of movement
    onMove({ forward: moveForward, strafe: moveStrafe });

    if (!disabled && (moveForward !== 0 || moveStrafe !== 0)) {
      // Normalize diagonal movement
      const length = Math.sqrt(moveForward * moveForward + moveStrafe * moveStrafe);
      const normalizedForward = moveForward / length;
      const normalizedStrafe = moveStrafe / length;

      // Calculate movement in world space relative to camera
      const forwardX = Math.sin(cameraAngle.current.horizontal);
      const forwardZ = Math.cos(cameraAngle.current.horizontal);

      const strafeX = Math.cos(cameraAngle.current.horizontal);
      const strafeZ = -Math.sin(cameraAngle.current.horizontal);

      const moveX = (normalizedForward * forwardX + normalizedStrafe * strafeX) * moveSpeed;
      const moveZ = (normalizedForward * forwardZ + normalizedStrafe * strafeZ) * moveSpeed;

      playerPosition.x += moveX;
      playerPosition.z += moveZ;

      // Update player rotation to face camera direction
      playerRotation.current = cameraAngle.current.horizontal + Math.PI;
    }

    // Position camera behind and above player (over-the-shoulder)
    const cameraDistance = 4;
    const cameraHeightOffset = 1.5;
    const shoulderOffset = 0.5; // Slightly to the side for over-shoulder view

    const horizontalAngle = cameraAngle.current.horizontal;
    const verticalAngle = cameraAngle.current.vertical;

    camera.position.x = playerPosition.x - Math.sin(horizontalAngle) * cameraDistance * Math.cos(verticalAngle) + Math.cos(horizontalAngle) * shoulderOffset;
    camera.position.y = playerPosition.y + cameraHeightOffset + Math.sin(verticalAngle) * cameraDistance;
    camera.position.z = playerPosition.z - Math.cos(horizontalAngle) * cameraDistance * Math.cos(verticalAngle) + Math.sin(horizontalAngle) * shoulderOffset;

    camera.lookAt(playerPosition.x, playerPosition.y + 1, playerPosition.z);
  });

  return null;
}

// Snow particle effect component
function Snow() {
  const flakeCount = 2000;
  const snowRef = useRef<THREE.Points>(null);

  const [positions, velocities, sizes] = useMemo(() => {
    const positions = new Float32Array(flakeCount * 3);
    const velocities = new Float32Array(flakeCount * 3);
    const sizes = new Float32Array(flakeCount);

    for (let i = 0; i < flakeCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

      velocities[i * 3] = (Math.random() - 0.5) * 0.02; // X drift
      velocities[i * 3 + 1] = -(0.05 + Math.random() * 0.05); // Y fall speed
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02; // Z drift

      sizes[i] = 0.5 + Math.random() * 1.5;
    }

    return [positions, velocities, sizes];
  }, []);

  useFrame(() => {
    if (!snowRef.current) return;

    const posArray = snowRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < flakeCount; i++) {
      posArray[i * 3] += velocities[i * 3];
      posArray[i * 3 + 1] += velocities[i * 3 + 1];
      posArray[i * 3 + 2] += velocities[i * 3 + 2];

      // Reset snowflake to top when it falls below ground
      if (posArray[i * 3 + 1] < 0) {
        posArray[i * 3] = (Math.random() - 0.5) * 100;
        posArray[i * 3 + 1] = 30;
        posArray[i * 3 + 2] = (Math.random() - 0.5) * 100;
      }
    }

    snowRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={snowRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={flakeCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={flakeCount}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={1}
        transparent
        opacity={0.8}
        sizeAttenuation
        map={(() => {
          // Create a round texture for the particles
          const canvas = document.createElement('canvas');
          canvas.width = 32;
          canvas.height = 32;
          const ctx = canvas.getContext('2d')!;
          const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
          gradient.addColorStop(0, 'rgba(255,255,255,1)');
          gradient.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 32, 32);
          const texture = new THREE.CanvasTexture(canvas);
          return texture;
        })()}
      />
    </points>
  );
}

interface ComboIndicatorProps {
  comboWindow: number;
  maxComboWindow: number;
  comboCount: number;
}

function ComboIndicator({ comboWindow, maxComboWindow, comboCount }: ComboIndicatorProps) {
  if (comboWindow <= 0) return null;

  const percentage = (comboWindow / maxComboWindow) * 100;
  const isGoodTiming = percentage > 30;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '25%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '300px',
        zIndex: 100,
      }}
    >
      {/* Combo counter */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#fff',
          textShadow: '0 0 10px rgba(255, 100, 100, 0.8), 0 0 20px rgba(255, 100, 100, 0.5)',
          marginBottom: '0.5rem',
        }}
      >
        {comboCount} HIT{comboCount > 1 ? 'S' : ''}
      </div>

      {/* Timing window bar */}
      <div
        style={{
          width: '100%',
          height: '20px',
          background: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '2px solid rgba(255, 255, 255, 0.3)',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: isGoodTiming
              ? 'linear-gradient(90deg, #4ade80, #22c55e)'
              : 'linear-gradient(90deg, #fbbf24, #f59e0b)',
            transition: 'width 0.05s linear',
            boxShadow: isGoodTiming
              ? '0 0 10px rgba(74, 222, 128, 0.8)'
              : '0 0 10px rgba(251, 191, 36, 0.8)',
          }}
        />
      </div>

      {/* Instruction text */}
      <div
        style={{
          textAlign: 'center',
          marginTop: '0.5rem',
          fontSize: '1rem',
          color: isGoodTiming ? '#4ade80' : '#fbbf24',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
          fontWeight: 'bold',
        }}
      >
        {isGoodTiming ? 'CLICK NOW!' : 'TIMING...'}
      </div>
    </div>
  );
}

interface ComboManagerProps {
  comboWindowRef: React.MutableRefObject<number>;
  setComboWindow: (value: number) => void;
  setComboCount: (value: number) => void;
}

function ComboManager({ comboWindowRef, setComboWindow, setComboCount }: ComboManagerProps) {
  // Handle combo window countdown
  useFrame(() => {
    if (comboWindowRef.current > 0) {
      comboWindowRef.current--;
      setComboWindow(comboWindowRef.current);

      if (comboWindowRef.current === 0) {
        setComboCount(0);
      }
    }
  });

  return null;
}

interface AttackableSceneProps {
  stageUrl: string;
  characterUrl: string;
  textureUrl?: string;
  animationsUrl?: string;
  enemyUrl: string;
}

export default function AttackableScene({
  stageUrl,
  characterUrl,
  textureUrl,
  animationsUrl,
  enemyUrl,
}: AttackableSceneProps) {
  const playerPosition = useRef(new THREE.Vector3(0, 0, 5));
  const playerRotation = useRef(0);

  const [currentAnimation, setCurrentAnimation] = useState('pwbn_wait');
  const [comboCount, setComboCount] = useState(0);
  const [comboWindow, setComboWindow] = useState(0);
  const [isAttacking, setIsAttacking] = useState(false);

  const maxComboWindow = 60; // frames (approximately 1 second at 60fps)
  const comboWindowRef = useRef(0);
  const isAttackingRef = useRef(false);

  const [movement, setMovement] = useState({ forward: 0, strafe: 0 });
  const [debugPosition, setDebugPosition] = useState({ x: 0, y: 0, z: 0 });

  // Update debug position periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setDebugPosition({
        x: playerPosition.current.x,
        y: playerPosition.current.y,
        z: playerPosition.current.z,
      });
    }, 100); // Update every 100ms
    return () => clearInterval(interval);
  }, []);

  // Update animation based on movement and attack state
  useEffect(() => {
    if (isAttacking) return; // Don't change animation during attack

    if (movement.forward !== 0 && movement.strafe === 0) {
      setCurrentAnimation('pmsa_stp_fp');
    } else if (movement.strafe !== 0 && movement.forward === 0) {
      setCurrentAnimation('pmsa_stp_lr');
    } else if (movement.forward !== 0 && movement.strafe !== 0) {
      // Diagonal movement - use forward/back strafe
      setCurrentAnimation('pmsa_stp_fp');
    } else {
      setCurrentAnimation('pwbn_wait');
    }
  }, [movement, isAttacking]);

  const handleAttack = () => {
    if (isAttackingRef.current) {
      // Clicked during combo window
      if (comboWindowRef.current > 0) {
        const nextCombo = (comboCount % 3) + 1;
        setComboCount(nextCombo);
        setCurrentAnimation(`pwbn_atk${nextCombo}`);
        comboWindowRef.current = maxComboWindow;
        setComboWindow(maxComboWindow);
      }
    } else {
      // Start new combo
      setIsAttacking(true);
      isAttackingRef.current = true;
      setComboCount(1);
      setCurrentAnimation('pwbn_atk1');
      comboWindowRef.current = maxComboWindow;
      setComboWindow(maxComboWindow);
    }
  };

  const handleAnimationEnd = () => {
    if (currentAnimation.includes('atk')) {
      // Attack animation finished
      // Wait for combo window to expire before resetting
      setIsAttacking(false);
      isAttackingRef.current = false;
    }
  };

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {/* Controls Info */}
      <div
        style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          zIndex: 100,
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '1rem',
          borderRadius: '4px',
          color: '#fff',
          fontSize: '0.85rem',
          pointerEvents: 'none',
        }}
      >
        <div><strong>Controls:</strong></div>
        <div>W - Forward Strafe</div>
        <div>S - Backward Strafe</div>
        <div>A - Left Strafe</div>
        <div>D - Right Strafe</div>
        <div>Mouse - Look Around</div>
        <div>Left Click - Attack</div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', opacity: 0.7 }}>
          Click screen to lock cursor
        </div>
        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
          ESC to unlock cursor
        </div>
      </div>

      {/* Debug Position Display */}
      <div
        style={{
          position: 'absolute',
          bottom: '1rem',
          left: '1rem',
          zIndex: 100,
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '1rem',
          borderRadius: '4px',
          color: '#fff',
          fontSize: '0.85rem',
          fontFamily: 'monospace',
          pointerEvents: 'none',
        }}
      >
        <div><strong>Position (for lights):</strong></div>
        <div>X: {debugPosition.x.toFixed(2)}</div>
        <div>Y: {debugPosition.y.toFixed(2)}</div>
        <div>Z: {debugPosition.z.toFixed(2)}</div>
      </div>

      {/* Scene Info */}
      <div
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          zIndex: 100,
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '1rem',
          borderRadius: '4px',
          color: '#fff',
          fontSize: '0.85rem',
          pointerEvents: 'none',
        }}
      >
        <div><strong>Scene:</strong> Rioh Snowfield</div>
        <div><strong>Weather:</strong> Snow</div>
        <div><strong>Character:</strong> HUmarl (pc_010)</div>
        <div><strong>Animation:</strong> {currentAnimation}</div>
        <div><strong>Combo:</strong> {comboCount > 0 ? `${comboCount} hit${comboCount > 1 ? 's' : ''}` : 'None'}</div>
      </div>

      {/* Combo Indicator */}
      <ComboIndicator
        comboWindow={comboWindow}
        maxComboWindow={maxComboWindow}
        comboCount={comboCount}
      />

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 2, 5], fov: 75 }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor('#d0e8f2');
          scene.fog = new THREE.Fog('#d0e8f2', 10, 60);
        }}
      >
        {/* Lighting - Bright and cold for snowy environment */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
        <directionalLight position={[-10, 15, -5]} intensity={0.3} color="#b8d4e8" />
        <hemisphereLight args={['#d0e8f2', '#ffffff', 0.5]} />

        {/* Snow Particle Effect */}
        <Snow />

        {/* Combo Window Manager */}
        <ComboManager
          comboWindowRef={comboWindowRef}
          setComboWindow={setComboWindow}
          setComboCount={setComboCount}
        />

        {/* Over-the-shoulder Controls */}
        <OverShoulderControls
          playerPosition={playerPosition.current}
          playerRotation={playerRotation}
          onMove={setMovement}
          onAttack={handleAttack}
          disabled={false}
        />

        {/* Stage */}
        <Suspense fallback={null}>
          <StageModel stageUrl={stageUrl} />
        </Suspense>

        {/* Rappy Enemy */}
        <Suspense fallback={null}>
          <Enemy url={enemyUrl} position={[0, 0, 0]} />
        </Suspense>

        {/* Player Character */}
        <Suspense fallback={null}>
          <PlayerCharacter
            characterUrl={characterUrl}
            textureUrl={textureUrl}
            animationsUrl={animationsUrl}
            position={playerPosition.current}
            rotationRef={playerRotation}
            currentAnimation={currentAnimation}
            onAnimationEnd={handleAnimationEnd}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
