declare module "node:crypto" {
  type EncodedBytes = Uint8Array & {
    toString(encoding: "hex" | "base64url"): string;
  };

  export function createHash(algorithm: string): {
    update(data: string): {
      digest(encoding: "hex"): string;
    };
  };

  export function randomBytes(size: number): EncodedBytes;

  export function scryptSync(
    password: string,
    salt: string,
    keylen: number,
  ): EncodedBytes;

  export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
}

declare const Buffer: {
  from(value: string, encoding: "hex"): Uint8Array;
};
