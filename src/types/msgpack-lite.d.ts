declare module "msgpack-lite" {
  export function encode(obj: any): Buffer;
  export function decode(buffer: Buffer): any;
}
