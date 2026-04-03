import {
  CloudWatchLogsClient,
  CreateLogStreamCommand,
  InvalidSequenceTokenException,
  PutLogEventsCommand,
  ResourceAlreadyExistsException,
} from "@aws-sdk/client-cloudwatch-logs";

export interface CloudWatchLogSinkOptions {
  logGroupName: string;
  streamNamePrefix: string;
  region?: string;
}

/**
 * Application-side sink for PutLogEvents (local/staging → Datadog via CW).
 * Pattern aligned with typical agent HTTP services that forward JSON lines to observability stacks.
 */
export class CloudWatchLogSink {
  private readonly client: CloudWatchLogsClient;

  private readonly logGroupName: string;

  private readonly streamNamePrefix: string;

  private readonly streamTokens = new Map<string, string | undefined>();

  private readonly ensuredStreams = new Set<string>();

  constructor(options: CloudWatchLogSinkOptions) {
    this.logGroupName = options.logGroupName;
    this.streamNamePrefix = options.streamNamePrefix;
    this.client = new CloudWatchLogsClient({
      region: options.region ?? process.env.AWS_REGION ?? "ap-southeast-2",
    });
  }

  private logStreamName(): string {
    const date = new Date().toISOString().slice(0, 10);
    return `${this.streamNamePrefix}-${date}`;
  }

  private async ensureLogStream(stream: string): Promise<void> {
    if (this.ensuredStreams.has(stream)) {
      return;
    }
    try {
      await this.client.send(
        new CreateLogStreamCommand({
          logGroupName: this.logGroupName,
          logStreamName: stream,
        }),
      );
    } catch (err: unknown) {
      if (!(err instanceof ResourceAlreadyExistsException)) {
        throw err;
      }
    }
    this.ensuredStreams.add(stream);
  }

  async emitJsonLine(line: string): Promise<void> {
    const stream = this.logStreamName();
    await this.ensureLogStream(stream);

    let sequenceToken = this.streamTokens.get(stream);
    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const out = await this.client.send(
          new PutLogEventsCommand({
            logGroupName: this.logGroupName,
            logStreamName: stream,
            sequenceToken,
            logEvents: [
              {
                timestamp: Date.now(),
                message: line,
              },
            ],
          }),
        );
        this.streamTokens.set(stream, out.nextSequenceToken);
        return;
      } catch (err: unknown) {
        if (
          err instanceof InvalidSequenceTokenException &&
          err.expectedSequenceToken
        ) {
          sequenceToken = err.expectedSequenceToken;
          this.streamTokens.set(stream, sequenceToken);
          continue;
        }
        throw err;
      }
    }
  }
}
