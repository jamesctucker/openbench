export interface CronConfig {
  default: {
    model?: string;
    timeout: number;
  };
  log_dir: string;
  locks_dir: string;
  install_dir: string;
}

export interface Job {
  name: string;
  cron: string;
  prompt: string;
  skills?: string[];
  model?: string;
  agent?: string;
  output?: string;
  append?: boolean;
  prepend?: boolean;
  timeout?: number;
  hostname?: string;
}

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}
