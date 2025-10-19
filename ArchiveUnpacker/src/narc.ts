/*
    This file is part of ArchiveUnpacker Library
    Copyright 2023 [Benjamin Collins](kion@dashgl.com)

    Permission is hereby granted, free of charge, to any person obtaining 
    a copy of this software and associated documentation files (the
    "Software"), to deal in the Software without restriction, including 
    without limitation the rights to use, copy, modify, merge, publish, 
    distribute, sublicense, and/or sell copies of the Software, and to 
    permit persons to whom the Software is furnished to do so, subject to 
    the following conditions:

    The above copyright notice and this permission notice shall be included     
    in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
    OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF 
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. 
    IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY 
    CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, 
    TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE 
    SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
    
*/

import ByteReader from './ByteReader';
import { ByteFile } from './types';

const narc = (inBuffer: ArrayBuffer): ByteFile[] => {
  const files: ByteFile[] = [];

  if (inBuffer.byteLength < 16) {
    throw new Error('NARC file too small');
  }

  const bs = new ByteReader(inBuffer);

  // https://docs.dashgl.com/format/phantasy-star-zero/narc-archive#narc-section

  const NARC_MAGIC = 0x4352414e;

  const narcSection = {
    magic: bs.readUInt32(),
    a: bs.readUInt16(),
    b: bs.readUInt16(),
    archiveLen: bs.readUInt32(),
    headerLen: bs.readUInt16(),
    c: bs.readUInt16(),
  };

  if (narcSection.magic !== NARC_MAGIC) {
    throw new Error(`Invalid NARC magic number: 0x${narcSection.magic.toString(16).toUpperCase()}`);
  }

  if (narcSection.archiveLen !== inBuffer.byteLength) {
    console.warn(`NARC archive length mismatch: expected ${narcSection.archiveLen}, got ${inBuffer.byteLength}`);
  }

  // https://docs.dashgl.com/format/phantasy-star-zero/narc-archive#btaf-section

  const BTAF_MAGIC = 0x46415442;

  type bnafFiles_t = {
    name: string;
    startOffset: number;
    endOffset: number;
  };

  const btafSection = {
    magic: bs.readUInt32(),
    length: bs.readUInt32(),
    count: bs.readUInt32(),
  };

  if (btafSection.magic !== BTAF_MAGIC) {
    throw new Error('Invalid BTAF magic number');
  }

  const { count } = btafSection;
  const bnafFiles: bnafFiles_t[] = [];

  for (let i = 0; i < count; i++) {
    bnafFiles.push({
      name: '',
      startOffset: bs.readUInt32(),
      endOffset: bs.readUInt32(),
    });
  }

  // https://docs.dashgl.com/format/phantasy-star-zero/narc-archive#btnf-section

  const btnfHeader = {
    magic: bs.readUInt32(),
    length: bs.readUInt32(),
  };

  // Store current position for later FIMG section calculation
  const btnfSectionStart = bs.tell();

  const rootNameEntryOffset = bs.readUInt32();

  // Read file names
  if (btnfHeader.length >= 16 && rootNameEntryOffset !== 4) {
    const firstFileIndex = bs.readUInt16();
    const rootDirectory = {
      parent: -1,
      name: '',
      nameEntryOffset: 0,
      firstFileIndex,
      count: 0,
    };

    const directoryEntryCount = bs.readUInt16();
    const directoryEntries = [rootDirectory];

    for (let i = 1; i < directoryEntryCount; i++) {
      const nameEntryTableOffset = bs.readUInt32();
      const firstFileIndex = bs.readUInt16();
      const parentDirectoryIndex = bs.readUInt16() & 0xfff;

      directoryEntries.push({
        parent: parentDirectoryIndex,
        name: `${parentDirectoryIndex.toString().padStart(3, '0')}`,
        nameEntryOffset: nameEntryTableOffset,
        firstFileIndex: firstFileIndex,
        count: 0,
      });
    }

    let currentDirectory = rootDirectory;
    let directoryIndex = 0;
    let fileIndex = 0;

    while (directoryIndex < directoryEntryCount) {
      const byte = bs.readUInt8();

      if (byte === 0) {
        directoryIndex++;
        if (directoryIndex >= directoryEntryCount) {
          break;
        }
        currentDirectory = directoryEntries[directoryIndex];
        continue;
      }

      currentDirectory.count++;
      const stringLen = byte & 0x7f;
      const name = bs.readString(stringLen);

      if (byte & 0x80) {
        const entryDirectoryIndex = bs.readUInt16() & 0xfff;
        const directoryEntry = directoryEntries[entryDirectoryIndex];
        directoryEntry.name = name;
      } else {
        const fileEntry = bnafFiles[fileIndex];
        const dir = directoryEntries[directoryIndex].name;

        fileEntry.name = dir + name;
        fileIndex++;
      }
    }
  }

  // Helper function to detect file type from magic bytes
  const detectFileType = (data: ArrayBuffer): string => {
    if (data.byteLength < 4) return 'bin';

    const view = new DataView(data);
    const magic = view.getUint32(0, false); // Big-endian

    switch (magic) {
      case 0x424D4430: return 'nsbmd'; // BMD0
      case 0x42545830: return 'nsbtx'; // BTX0
      case 0x42434130: return 'nsbca'; // BCA0
      case 0x42545030: return 'nsbtp'; // BTP0
      case 0x42544130: return 'nsbta'; // BTA0
      case 0x4E415243: return 'narc';  // NARC
      default: return 'bin';
    }
  };

  // Find FIMG section (file data)
  // Scan for FIMG section starting from current position
  let fimgPosition = -1;
  const startScanPosition = bs.tell();

  // Scan up to 1KB ahead for FIMG section
  for (let pos = startScanPosition; pos < Math.min(startScanPosition + 1024, inBuffer.byteLength - 8); pos++) {
    bs.seek(pos);
    const testMagic = bs.readString(4);
    if (testMagic === 'FIMG' || testMagic === 'GMIF') {
      fimgPosition = pos;
      break;
    }
  }

  if (fimgPosition === -1) {
    throw new Error('FIMG section not found');
  }

  bs.seek(fimgPosition);
  const fimgMagic = bs.readString(4);
  const fimgLength = bs.readUInt32();
  const fimgDataStart = bs.tell(); // This is where file data actually starts

  // Loop Through each file and slice
  bnafFiles.forEach((file, index) => {
    const { name, startOffset, endOffset } = file;

    try {
      // Calculate absolute positions from FIMG data start
      const absoluteStart = fimgDataStart + startOffset;
      const absoluteEnd = fimgDataStart + endOffset;
      const data = bs.subArray(absoluteStart, absoluteEnd);

      // Generate filename if not provided
      let fileName = name;
      const fileType = detectFileType(data);

      if (!fileName || fileName.trim() === '') {
        // No name provided, use index with detected extension
        const extension = fileType === 'bin' ? 'bin' : fileType;
        fileName = `${index.toString().padStart(2, '0')}.${extension}`;
      } else {
        // Name provided, but ensure it has the correct extension
        // Check if name already has an extension
        const hasExtension = fileName.includes('.');
        if (!hasExtension && fileType !== 'bin') {
          // Add the detected extension
          fileName = `${fileName}.${fileType}`;
        }
      }

      files.push({ name: fileName, data });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Failed to extract file ${index}: ${message}`);
      // Add empty file entry to maintain index consistency
      files.push({
        name: `${index.toString().padStart(2, '0')}.error`,
        data: new ArrayBuffer(0)
      });
    }
  });

  return files;
};

export default narc;
