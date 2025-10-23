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
  onAnimationProgress?: (progress: number) => void;
  shouldPauseAtEnd?: boolean;
}

function PlayerCharacter({
  characterUrl,
  textureUrl,
  animationsUrl,
  position,
  rotationRef,
  currentAnimation,
  onAnimationEnd,
  onAnimationProgress,
  shouldPauseAtEnd,
}: PlayerCharacterProps) {
  const group = useRef<Group>(null);
  const gltf = useGLTF(characterUrl);

  // Load external animations if provided
  const animGltf = animationsUrl ? useGLTF(animationsUrl) : null;
  const animationsToUse = animGltf?.animations || gltf.animations;
  const { actions, mixer } = useAnimations(animationsToUse, group);

  const previousAnimation = useRef<string>('');
  const isPaused = useRef(false);

  // Log available animations once
  useEffect(() => {
    if (animationsToUse.length > 0) {
      console.log('Available animations:', animationsToUse.map(a => a.name));
    }
  }, [animationsToUse]);

  // Track animation progress and handle pausing
  useFrame(() => {
    if (group.current && currentAnimation) {
      const action = actions[currentAnimation];
      if (action && action.isRunning()) {
        const duration = action.getClip().duration;
        const time = action.time;
        const progress = duration > 0 ? time / duration : 0;

        // Report progress
        if (onAnimationProgress) {
          onAnimationProgress(progress);
        }

        // Pause at end if requested and near completion
        // Use 0.98 to ensure we're on the last frame, not earlier
        if (shouldPauseAtEnd && progress >= 0.98 && !isPaused.current) {
          action.paused = true;
          isPaused.current = true;
        }
      }
    }
  });

  // Resume animation when shouldPauseAtEnd changes to false
  useEffect(() => {
    if (!shouldPauseAtEnd && isPaused.current) {
      const action = actions[currentAnimation];
      if (action) {
        action.paused = false;
        isPaused.current = false;
      }
    }
  }, [shouldPauseAtEnd, currentAnimation, actions]);

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

    // Reset pause state
    isPaused.current = false;
    action.paused = false;

    // Play new animation
    action.reset().fadeIn(0.1);

    // Set loop based on animation type
    if (currentAnimation.includes('atk')) {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.timeScale = 0.75; // Slow down attack animations by 25%
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.timeScale = 1.0; // Normal speed for movement
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

      // Update player rotation to face movement direction
      playerRotation.current = cameraAngle.current.horizontal;
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

// Lantern lights component
function Lanterns() {
  const lanternPositions: [number, number, number][] = [
    [-22, 10, 8.40],
    [-23.4, 10, -12.61],
    [-4.46, 10, -21.3],
    [25.08, 10, -8.4],
    [13.16, 10, 20.3],
  ];

  return (
    <>
      {lanternPositions.map((position, index) => (
        <pointLight
          key={index}
          position={position}
          color="#ff4422"
          intensity={50}
          distance={30}
          decay={2}
        />
      ))}
    </>
  );
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
  comboState: 'idle' | 'attacking' | 'combo_window' | 'cooldown';
  comboStep: number;
  comboWindowProgress: number;
  cooldownTimer: number;
  attackProgress: number; // 0 to 1, current attack animation progress
}

function ComboIndicator({ comboState, comboStep, comboWindowProgress, cooldownTimer, attackProgress }: ComboIndicatorProps) {
  // Only show when in combat states
  if (comboState === 'idle') return null;

  const showAttacking = comboState === 'attacking';
  const showWindow = comboState === 'combo_window';
  const showCooldown = comboState === 'cooldown';

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
      {comboStep > 0 && (
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
          {comboStep} HIT{comboStep > 1 ? 'S' : ''}
        </div>
      )}

      {/* Attack charging bar (red, fills up during attack animation) */}
      {showAttacking && (
        <>
          <div
            style={{
              width: '100%',
              height: '20px',
              background: 'rgba(0, 0, 0, 0.7)',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '2px solid rgba(255, 100, 100, 0.5)',
            }}
          >
            <div
              style={{
                width: `${attackProgress * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #dc2626, #ef4444)',
                transition: 'width 0.05s linear',
                boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
              }}
            />
          </div>

          <div
            style={{
              textAlign: 'center',
              marginTop: '0.5rem',
              fontSize: '0.9rem',
              color: '#ef4444',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
              fontWeight: 'bold',
            }}
          >
            ATTACKING...
          </div>
        </>
      )}

      {/* Combo window bar (green, empties during window countdown) */}
      {showWindow && (
        <>
          <div
            style={{
              width: '100%',
              height: '20px',
              background: 'rgba(0, 0, 0, 0.7)',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '2px solid rgba(74, 222, 128, 0.8)',
            }}
          >
            <div
              style={{
                width: `${(comboWindowProgress / 18) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #4ade80, #22c55e)',
                transition: 'width 0.05s linear',
                boxShadow: '0 0 10px rgba(74, 222, 128, 0.8)',
              }}
            />
          </div>

          {/* Instruction text */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '0.5rem',
              fontSize: '1rem',
              color: '#4ade80',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
              fontWeight: 'bold',
            }}
          >
            CLICK NOW! ({Math.ceil((comboWindowProgress / 60) * 1000)}ms)
          </div>
        </>
      )}

      {/* Cooldown bar (orange/yellow, empties during cooldown) */}
      {showCooldown && (
        <>
          <div
            style={{
              width: '100%',
              height: '20px',
              background: 'rgba(0, 0, 0, 0.7)',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '2px solid rgba(251, 146, 60, 0.5)',
            }}
          >
            <div
              style={{
                width: `${(cooldownTimer / 60) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #f59e0b, #fb923c)',
                transition: 'width 0.05s linear',
                boxShadow: '0 0 10px rgba(251, 146, 60, 0.6)',
              }}
            />
          </div>

          <div
            style={{
              textAlign: 'center',
              marginTop: '0.5rem',
              fontSize: '1rem',
              color: '#fb923c',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
              fontWeight: 'bold',
            }}
          >
            COOLDOWN ({Math.ceil((cooldownTimer / 60) * 1000)}ms)
          </div>
        </>
      )}
    </div>
  );
}


interface TimerManagerProps {
  cooldownTimer: number;
  setCooldownTimer: (value: number) => void;
  comboWindowProgress: number;
  setComboWindowProgress: (value: number) => void;
  comboState: 'idle' | 'attacking' | 'combo_window' | 'cooldown';
  comboStep: number;
  setComboState: (state: 'idle' | 'attacking' | 'combo_window' | 'cooldown') => void;
  setComboStep: (step: number) => void;
}

function TimerManager({
  cooldownTimer,
  setCooldownTimer,
  comboWindowProgress,
  setComboWindowProgress,
  comboState,
  comboStep,
  setComboState,
  setComboStep
}: TimerManagerProps) {
  useFrame(() => {
    // Handle cooldown timer
    if (cooldownTimer > 0) {
      setCooldownTimer(cooldownTimer - 1);
      if (cooldownTimer === 1) {
        setComboState('idle');
        setComboStep(0);
      }
    }

    // Handle combo window countdown
    if (comboState === 'combo_window' && comboWindowProgress > 0) {
      setComboWindowProgress(comboWindowProgress - 1);
      if (comboWindowProgress === 1) {
        // Window expired, enter cooldown
        setComboState('cooldown');
        setCooldownTimer(60); // 1 second cooldown
        setComboWindowProgress(0);
        // If we completed all 3 attacks, we need to enter cooldown
        // The animation will be reset to idle in the next effect cycle
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
  const [comboStep, setComboStep] = useState(0); // 0 = idle, 1-3 = attack number
  const [comboState, setComboState] = useState<'idle' | 'attacking' | 'combo_window' | 'cooldown'>('idle');
  const [comboWindowProgress, setComboWindowProgress] = useState(0);
  const [cooldownTimer, setCooldownTimer] = useState(0);
  const [attackProgress, setAttackProgress] = useState(0); // 0 to 1, current attack animation progress

  const [movement, setMovement] = useState({ forward: 0, strafe: 0 });
  const [debugPosition, setDebugPosition] = useState({ x: 0, y: 0, z: 0 });

  const comboWindowStart = 0.98; // Combo window starts at 98% (very end of animation)
  const cooldownDuration = 60; // frames (1 second at 60fps)
  const comboWindowDuration = 18; // 300ms at 60fps

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

  // Update animation based on movement and combat state
  useEffect(() => {
    // During attacking or combo_window, don't change animation
    if (comboState === 'attacking' || comboState === 'combo_window') return;

    // During cooldown or idle, allow movement animations
    if (movement.forward !== 0 && movement.strafe === 0) {
      setCurrentAnimation('pmsa_stp_fb');
    } else if (movement.strafe !== 0 && movement.forward === 0) {
      setCurrentAnimation('pmsa_stp_lr');
    } else if (movement.forward !== 0 && movement.strafe !== 0) {
      // Diagonal movement - use forward/back strafe
      setCurrentAnimation('pmsa_stp_fb');
    } else {
      setCurrentAnimation('pwbn_wait');
    }
  }, [movement, comboState]);

  // Handle animation progress for combo windows
  const handleAnimationProgress = (progress: number) => {
    // Update attack progress bar
    if (comboState === 'attacking') {
      setAttackProgress(progress);

      if (progress >= comboWindowStart) {
        // Animation reached end, freeze and start combo window
        setComboState('combo_window');
        setComboWindowProgress(comboWindowDuration);
      }
    }
  };

  const handleAttack = () => {
    if (comboState === 'idle') {
      // Start new combo
      setComboState('attacking');
      setComboStep(1);
      setCurrentAnimation('pwbn_atk1');
      setAttackProgress(0); // Reset attack progress
    } else if (comboState === 'combo_window') {
      // Continue combo
      const nextStep = comboStep + 1;
      if (nextStep <= 3) {
        setComboState('attacking');
        setComboStep(nextStep);
        setCurrentAnimation(`pwbn_atk${nextStep}`);
        setComboWindowProgress(0);
        setAttackProgress(0); // Reset attack progress for next attack
      }
    }
    // Ignore clicks during attacking or cooldown states
  };

  const handleAnimationEnd = () => {
    // Animation finished events - not really used anymore since we handle via progress
    // The combo window will expire naturally if not clicked
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
        <div><strong>Scene:</strong> Rioh Snowfield (Night)</div>
        <div><strong>Weather:</strong> Snow</div>
        <div><strong>Character:</strong> HUmarl (pc_010)</div>
        <div><strong>Animation:</strong> {currentAnimation}</div>
        <div><strong>State:</strong> {comboState}</div>
      </div>

      {/* Combo Indicator */}
      <ComboIndicator
        comboState={comboState}
        comboStep={comboStep}
        comboWindowProgress={comboWindowProgress}
        cooldownTimer={cooldownTimer}
        attackProgress={attackProgress}
      />

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 2, 5], fov: 75 }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor('#000000');
          scene.fog = new THREE.FogExp2('#000000', 0.03);
        }}
      >
        {/* Lighting - Dark night atmosphere with lanterns */}
        <ambientLight intensity={0.01} />
        <directionalLight position={[10, 20, 10]} intensity={0.05} color="#0a0a1a" castShadow />
        <hemisphereLight args={['#000000', '#000000', 0.02]} />

        {/* Red lantern lights */}
        <Lanterns />

        {/* Snow Particle Effect */}
        <Snow />

        {/* Timer Manager for cooldowns and combo windows */}
        <TimerManager
          cooldownTimer={cooldownTimer}
          setCooldownTimer={setCooldownTimer}
          comboWindowProgress={comboWindowProgress}
          setComboWindowProgress={setComboWindowProgress}
          comboState={comboState}
          comboStep={comboStep}
          setComboState={setComboState}
          setComboStep={setComboStep}
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
            onAnimationProgress={handleAnimationProgress}
            shouldPauseAtEnd={comboState === 'attacking'}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
