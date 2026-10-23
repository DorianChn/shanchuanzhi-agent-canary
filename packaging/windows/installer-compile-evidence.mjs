import fs from 'node:fs';

export function inspectInstallerCompileOutput(output, fileSystem = fs) {
  try {
    const stat = fileSystem.lstatSync(output);
    const outputBytes = stat.size;
    const outputIsRegularFile = stat.isFile() && !stat.isSymbolicLink();
    return {
      outputExists: true,
      outputBytes,
      outputValid: outputIsRegularFile && outputBytes > 0,
      inspectionErrorCode: null,
    };
  } catch (error) {
    return {
      outputExists: false,
      outputBytes: 0,
      outputValid: false,
      inspectionErrorCode: error?.code ?? 'UNKNOWN',
    };
  }
}
