export const wrappedSOL = 'So11111111111111111111111111111111111111112';

export type TokenInfo = {
  chainId: number;
  address: string;
  symbol: string;
  name?: string;
  decimals: number;
  logoURI: string;
  tags?: string[];
  extensions?: any;
  bets: number[];
};

const tokenRegistry = {
  So11111111111111111111111111111111111111112: {
    chainId: 101,
    address: wrappedSOL,
    symbol: 'SOL',
    name: 'SOL',
    decimals: 9,
    logoURI:
      'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    tags: [],
    extensions: {
      website: 'https://solana.com/',
      serumV3Usdc: '9wFFyRfZBsuAha4YcuxcXLKwMxJR43S7fPfQLusDBzvT',
      serumV3Usdt: 'HWHvQhFmJB3NUcu1aihKmrKegfVxBEHzwVX6yZCKEsi1',
      coingeckoId: 'solana',
      imageURI: '/resources/solana-logo.gif',
    },
    bets: [0.01, 0.05, 0.1, 0.25, 0.5, 1.0],
  },
  // '9bb1MAn3DwDxwrVyKRYFdBfNfWnn4k1EeHjbLmJ1nsNx': {
  //   chainId: 101,
  //   address: '9bb1MAn3DwDxwrVyKRYFdBfNfWnn4k1EeHjbLmJ1nsNx',
  //   symbol: 'TAG',
  //   name: 'TAG',
  //   decimals: 9,
  //   logoURI:
  //     'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/3Q8GPQfrMcDRknataFe46VYdsGYqwRTCuYxGqPSHGCQo/logo.png',
  //   tags: ['staking'],
  //   extensions: {},
  // },
  // 'CFp7pM2TE1S8WGQo7Wb9qvLogYfTkEJruanSbkFFfEtn': {
  //   chainId: 101,
  //   address: 'CFp7pM2TE1S8WGQo7Wb9qvLogYfTkEJruanSbkFFfEtn',
  //   symbol: 'DEV9',
  //   name: 'DEVNET_0_DECIMAL',
  //   decimals: 9,
  //   logoURI:
  //     'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/3Q8GPQfrMcDRknataFe46VYdsGYqwRTCuYxGqPSHGCQo/logo.png',
  //   tags: ['staking'],
  //   extensions: {},
  // },
  // DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: {
  //   chainId: 101,
  //   address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  //   symbol: 'BONK',
  //   name: 'Bonk',
  //   decimals: 5,
  //   logoURI: 'https://arweave.net/QPC6FYdUn-3V8ytFNuoCS85S2tHAuiDblh6u3CIZLsw',
  //   tags: ['utility-token', 'community-token', 'social-token'],
  //   extensions: {},
  //   bets: [100000, 1000000, 5000000, 10000000, 50000000, 100000000],
  // },
  // GkywroLpkvYQc5dmFfd2RchVYycXZdaA5Uzix42iJdNo: {
  //   chainId: 101,
  //   address: 'GkywroLpkvYQc5dmFfd2RchVYycXZdaA5Uzix42iJdNo',
  //   symbol: 'DROID',
  //   name: 'Droid DAO Token',
  //   decimals: 9,
  //   logoURI: 'https://raw.githubusercontent.com/LinYu1992/Droid_Capital_Token/main/Droid_coin_tiny_1.png',
  //   tags: ['utility-token', 'community-token', 'social-token'],
  //   extensions: {
  //     website: 'https://droidcapital.net/',
  //   },
  // },
  // CREAMpdDimXxj2zTCwP5wMEtba4NYaKCrTBEQTSKtqHe: {
  //   chainId: 101,
  //   address: 'CREAMpdDimXxj2zTCwP5wMEtba4NYaKCrTBEQTSKtqHe',
  //   symbol: 'CREAMY',
  //   name: 'Creamy',
  //   decimals: 9,
  //   logoURI:
  //     'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/CREAMpdDimXxj2zTCwP5wMEtba4NYaKCrTBEQTSKtqHe/logo.png',
  //   tags: ['community-token', 'utility-token', 'social-token'],
  //   extensions: {
  //     discord: 'https://discord.gg/creamyfriends',
  //     serumV3Usdc: 'BxTfmxEQf6FQ6F1cQ3fi6o6FPG52hiZXi4DTGYRhsmPo',
  //     twitter: 'https://twitter.com/CreamyFriends',
  //   },
  // },
  // DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ: {
  //   chainId: 101,
  //   address: 'DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ',
  //   symbol: 'DUST',
  //   name: 'DUST Protocol',
  //   decimals: 9,
  //   logoURI:
  //     'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ/logo.jpg',
  //   tags: ['NFT', 'utility-token'],
  //   extensions: {
  //     discord: 'https://discord.com/invite/dedao',
  //     twitter: 'https://twitter.com/degodsnft',
  //     website: 'https://docs.dustprotocol.com/',
  //   },
  //   bets: [1, 2, 4, 6, 10, 20]
  // },
  // '4Up16GyRmybEEDfaCsDszkzkvtWgoKDtS4cUyBEjvPBM': {
  //   chainId: 101,
  //   address: '4Up16GyRmybEEDfaCsDszkzkvtWgoKDtS4cUyBEjvPBM',
  //   symbol: 'VAULT',
  //   name: 'Vandal City Vault',
  //   decimals: 9,
  //   logoURI:
  //     'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4Up16GyRmybEEDfaCsDszkzkvtWgoKDtS4cUyBEjvPBM/logo.png',
  //   tags: ['gaming-token', 'social-token'],
  // },
  // '44thGfHRsdCB61NAkrDFe6djRrwWZegTTqrs1bwMeAGu': {
  //   chainId: 101,
  //   address: '44thGfHRsdCB61NAkrDFe6djRrwWZegTTqrs1bwMeAGu',
  //   symbol: '44TH',
  //   name: '44TH',
  //   decimals: 0,
  //   logoURI:
  //     'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/44thGfHRsdCB61NAkrDFe6djRrwWZegTTqrs1bwMeAGu/logo.png',
  //   tags: ['utility-token'],
  // },
  // '9WMwGcY6TcbSfy9XPpQymY3qNEsvEaYL3wivdwPG2fpp': {
  //   chainId: 101,
  //   address: '9WMwGcY6TcbSfy9XPpQymY3qNEsvEaYL3wivdwPG2fpp',
  //   symbol: 'JELLY',
  //   name: 'Jelly',
  //   decimals: 6,
  //   logoURI:
  //     'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/9WMwGcY6TcbSfy9XPpQymY3qNEsvEaYL3wivdwPG2fpp/logo.png',
  //   tags: ['utility-token'],
  //   extensions: {
  //     discord: 'https://discord.com/invite/wzEfUjmpFw',
  //     twitter: 'https://twitter.com/JellyBabiesNFT',
  //   },
  // },
  // ADQwix6UMnhZ13iAd5xQMWFUuw8cJRGj1RioqP3GZebg: {
  //   chainId: 101,
  //   address: 'ADQwix6UMnhZ13iAd5xQMWFUuw8cJRGj1RioqP3GZebg',
  //   symbol: 'SIGHT',
  //   name: 'Sight',
  //   decimals: 6,
  //   logoURI:
  //     'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/ADQwix6UMnhZ13iAd5xQMWFUuw8cJRGj1RioqP3GZebg/logo.png',
  //   tags: ['utility-coin'],
  //   extensions: {
  //     twitter: 'https://twitter.com/ReptilianReneg',
  //   },
  // },
  // ZNEc3wSpNycdsEtsccWXooa8fKb8n4rGC24Py6ZpyUx: {
  //   chainId: 101,
  //   address: 'ZNEc3wSpNycdsEtsccWXooa8fKb8n4rGC24Py6ZpyUx',
  //   symbol: 'SNEK',
  //   name: 'SNEK',
  //   decimals: 9,
  //   logoURI: 'https://raw.githubusercontent.com/danvernon/tiny-dogz-logo/main/zen-logo.png',
  //   tags: ['utility-token'],
  //   extensions: {
  //     discord: 'https://discord.com/ZenjinViperz',
  //     twitter: 'https://twitter.com/ZenjinViperz',
  //     website: 'https://www.zenjinviperz.io/',
  //   },
  // },
  // '3yeGqnYLXya7zPbTkEt2d84F489eV9mNia4WQHY3JefA': {
  //   chainId: 101,
  //   address: '3yeGqnYLXya7zPbTkEt2d84F489eV9mNia4WQHY3JefA',
  //   symbol: 'TRB',
  //   name: "Trippin' Ape Tribe Token",
  //   decimals: 6,
  //   logoURI:
  //     'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/3yeGqnYLXya7zPbTkEt2d84F489eV9mNia4WQHY3JefA/logo.png',
  //   tags: ['utility-token'],
  //   extensions: {
  //     twitter: 'https://twitter.com/TrippinApeNFT',
  //     website: 'https://www.trippinapetribe.xyz/',
  //   },
  // },
  // FdviznPoMEakdJ37fikNxhoscyruUHSHNkKyvntSqbuo: {
  //   chainId: 101,
  //   address: 'FdviznPoMEakdJ37fikNxhoscyruUHSHNkKyvntSqbuo',
  //   symbol: 'CATNIP',
  //   name: 'CATNIP',
  //   decimals: 0,
  //   logoURI:
  //     'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/FdviznPoMEakdJ37fikNxhoscyruUHSHNkKyvntSqbuo/logo.png',
  //   tags: ['utility-token', 'community-token'],
  //   extensions: {
  //     discord: 'https://discord.gg/WrUgj3BhrN',
  //     twitter: 'https://twitter.com/FatCatsCapital',
  //     website: 'https://fatcatscapital.com',
  //   },
  // },
  // '2xKnXYR11aaJD3kMw3Fy89DXdzij9XR8gB3wjwiGn3TM': {
  //   chainId: 101,
  //   address: '2xKnXYR11aaJD3kMw3Fy89DXdzij9XR8gB3wjwiGn3TM',
  //   symbol: 'WOLF',
  //   decimals: 9,
  //   logoURI:
  //     'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/FdviznPoMEakdJ37fikNxhoscyruUHSHNkKyvntSqbuo/logo.png',
  //   tags: ['utility-token', 'community-token'],
  //   extensions: {
  //     discord: 'https://discord.gg/WrUgj3BhrN',
  //     twitter: 'https://twitter.com/FatCatsCapital',
  //     website: 'https://fatcatscapital.com',
  //   },
  // },
  // H2QUnU6KRfPzWFDoFDWSq9ARpFeuLkFMyXdxRYdUaLLV: {
  //   chainId: 101,
  //   address: 'H2QUnU6KRfPzWFDoFDWSq9ARpFeuLkFMyXdxRYdUaLLV',
  //   symbol: 'PRIDE',
  //   decimals: 6,
  //   logoURI:
  //     'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/FdviznPoMEakdJ37fikNxhoscyruUHSHNkKyvntSqbuo/logo.png',
  //   tags: ['utility-token', 'community-token'],
  // },
  // '6mnFFeE2aKvkCjwszgHiUVg5VvRBCwssGDgQLDXMZzMp': {
  //   chainId: 101,
  //   address: '6mnFFeE2aKvkCjwszgHiUVg5VvRBCwssGDgQLDXMZzMp',
  //   symbol: '$LEO',
  //   decimals: 9,
  //   logoURI:
  //     'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/FdviznPoMEakdJ37fikNxhoscyruUHSHNkKyvntSqbuo/logo.png',
  //   tags: ['utility-token', 'community-token'],
  // },
  // sEedsCkfvPzjnfPNWVJAeNkNZf8yWTwZF3jh42R4X25: {
  //   chainId: 101,
  //   address: 'sEedsCkfvPzjnfPNWVJAeNkNZf8yWTwZF3jh42R4X25',
  //   symbol: 'SEEDS',
  //   decimals: 3,
  //   logoURI: 'https://www.arweave.net/baxZbVIin-NAYywh8B8Z05SpoLJBpKxs_HGOIIw_y9k?ext=jpeg',
  //   tags: ['nft-token', 'community-token'],
  // },
  // AYZoYF51p7M94Ug7o6zSqMZ5wBPanhs9X9qwHC8PVQwt: {
  //   chainId: 101,
  //   address: 'AYZoYF51p7M94Ug7o6zSqMZ5wBPanhs9X9qwHC8PVQwt',
  //   symbol: 'POP',
  //   decimals: 12,
  //   logoURI: 'https://www.arweave.net/baxZbVIin-NAYywh8B8Z05SpoLJBpKxs_HGOIIw_y9k?ext=jpeg',
  //   tags: ['nft-token', 'community-token'],
  // },
  // CRWN3q24KN8qNPCJWbh6HTMzggVZqFWpf15HmsRW9qjg: {
  //   chainId: 101,
  //   address: 'CRWN3q24KN8qNPCJWbh6HTMzggVZqFWpf15HmsRW9qjg',
  //   symbol: 'CROWN',
  //   decimals: 9,
  //   logoURI: 'https://www.arweave.net/baxZbVIin-NAYywh8B8Z05SpoLJBpKxs_HGOIIw_y9k?ext=jpeg',
  //   tags: ['nft-token', 'community-token'],
  // },
  // Ao94rg8D6oK2TAq3nm8YEQxfS73vZ2GWYw2AKaUihDEY: {
  //   chainId: 101,
  //   address: 'Ao94rg8D6oK2TAq3nm8YEQxfS73vZ2GWYw2AKaUihDEY',
  //   symbol: 'CRECK',
  //   decimals: 9,
  //   logoURI: 'https://www.arweave.net/baxZbVIin-NAYywh8B8Z05SpoLJBpKxs_HGOIIw_y9k?ext=jpeg',
  //   tags: ['social-token', 'community-token'],
  // },
  // boooCKXQn9YTK2aqN5pWftQeb9TH7cj7iUKuVCShWQx: {
  //   chainId: 101,
  //   address: 'boooCKXQn9YTK2aqN5pWftQeb9TH7cj7iUKuVCShWQx',
  //   symbol: 'BOO',
  //   decimals: 9,
  //   logoURI: 'https://www.arweave.net/baxZbVIin-NAYywh8B8Z05SpoLJBpKxs_HGOIIw_y9k?ext=jpeg',
  //   tags: ['utility-token', 'community-token'],
  // },
};
//3Q8GPQfrMcDRknataFe46VYdsGYqwRTCuYxGqPSHGCQo  my alphines error
export const tokenInfoMap: Map<string, TokenInfo> = new Map(Object.entries(tokenRegistry));

export const UNKNOWN_TOKEN_INFO = {
  chainId: 101,
  symbol: '???',
  name: 'Unkown token',
  decimals: 0,
  logoURI:
    'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/9nusLQeFKiocswDt6NQsiErm1M43H2b8x6v5onhivqKv/logo.png',
  tags: [],
  extensions: {},
};
