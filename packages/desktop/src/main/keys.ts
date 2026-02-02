/**
 * License Key Cryptography
 *
 * This file contains the public key used to verify license keys.
 * The private key is kept secure and used only for generating license keys.
 *
 * To generate a new RSA-2048 keypair, run:
 * npm run generate-keys
 *
 * This will create license-private-key.pem (keep secure!) and output the public key
 * to paste into the LICENSE_PUBLIC_KEY constant below.
 */

// Public key (RSA-2048) - used to verify license signatures
export const LICENSE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAs1YBlGe9xMGkibMB2Mma
zPnxmyoKMnj8z//0TPXvYxu5puM5ymMrtn4zeMvTEgiYLwqitmuetDf9+DPEQ/Lk
VPlekMbyXHp0dTPDdjhDo9YuQLVuyPUr7P0y2ybq8xtX/nQdRZkIryu8rcHW6X91
3aVZHhSN389bLYrPaN61JjSPCJKhfsG0X9/ggtM4qaTJY5m1t1+5Z8NJSP1Vdw02
VbbMtyFGiesPWB9IuukaWS/Xj9oeRuuRtSW7VWcKQkcBA/LttLDY/nRuOnCCLExE
goylbDFP3s94P3AiDlHHks+wza1kh6gb5PPFzc8sJYWyWzzEDrFcAksXzfze7qyZ
EwIDAQAB
-----END PUBLIC KEY-----`;
