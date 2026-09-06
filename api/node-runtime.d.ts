type RuntimeBuffer = import("exceljs").Buffer & {
  readonly length: number;
};

declare module "node:crypto" {
  type EncodedBytes = Uint8Array & {
    toString(encoding: "hex" | "base64url"): string;
  };

  export function createHash(algorithm: string): {
    update(data: string | Uint8Array | RuntimeBuffer): {
      digest(encoding: "hex"): string;
    };
  };

  export function randomBytes(size: number): EncodedBytes;
  export function scryptSync(password: string, salt: string, keylen: number): EncodedBytes;
  export function timingSafeEqual(a: Uint8Array | RuntimeBuffer, b: Uint8Array | RuntimeBuffer): boolean;
}

declare const Buffer: {
  from(value: string, encoding: "hex" | "base64" | "utf8"): RuntimeBuffer;
};

declare const console: {
  error(...args: unknown[]): void;
};

declare class URL {
  constructor(input: string);
  readonly pathname: string;
  readonly searchParams: {
    get(name: string): string | null;
  };
}