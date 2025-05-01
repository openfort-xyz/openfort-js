// This file is a workaround for the issue with the `entities` package

declare module 'entities/decode' {
  const decode: any;
  export default decode;
}
