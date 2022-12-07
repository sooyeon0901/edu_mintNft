import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Metaplex, keypairIdentity, bundlrStorage, toMetaplexFile, toBigNumber } from "@metaplex-foundation/js";
import * as fs from 'fs';
import secret from './mySecretKey.json';
// import { uploadMetadata } from './getMetadata';


const QUICKNODE_RPC = 'https://purple-rough-friday.solana-devnet.discover.quiknode.pro/1040b1574366a8baf12512f9d0c284994e12f066/';
const SOLANA_CONNECTION = new Connection(QUICKNODE_RPC);
const WALLET = Keypair.fromSecretKey(new Uint8Array(secret));

const METAPLEX = Metaplex.make(SOLANA_CONNECTION)
    .use(keypairIdentity(WALLET))
    .use(bundlrStorage({
        address: 'https://devnet.bundlr.network',
        providerUrl: QUICKNODE_RPC,
        timeout: 60000,
    }));

// 메타데이터 설정
const CONFIG = {
    uploadPath: 'img/',
    imgFileName: '00221.png',
    imgType: 'image/png',
    imgName: 'NFT 발행테스트',
    description: 'Pixel infrastructure for everyone!',
    attributes: [
        {trait_type: 'Speed', value: 'Quick'},
        {trait_type: 'Type', value: 'Pixelated'},
        {trait_type: 'Background', value: 'QuickNode Blue'}
    ],
    sellerFeeBasisPoints: 500,//500 bp = 5%
    symbol: 'QNPIX',
    creators: [
        {address: WALLET.publicKey, share: 100}
    ]
};

async function uploadImage(filePath: string, fileName: string) {
  console.log(`Step 1 - 이미지 업로드 시작`);

  const imgBuffer = fs.readFileSync(filePath+fileName);
  const imgMetaplexFile = toMetaplexFile(imgBuffer,fileName);
  const imgUri = await METAPLEX.storage().upload(imgMetaplexFile);
  console.log(`   Image URI:`,imgUri);
  return imgUri;
}

async function uploadMetadata(imgUri: string, imgType: string, nftName: string, description: string, attributes: {trait_type: string, value: string}[]) {
  console.log(`Step 2 - 메타데이터 업로드 시작`);
  
  const { uri } = await METAPLEX
  .nfts()
  .uploadMetadata({
    name: CONFIG.imgName,
    description: CONFIG.description,
    
    image: imgUri,
    attributes: CONFIG.attributes,
    properties: {
      files: [
        {
          type: CONFIG.imgType,
          uri: imgUri,
        },
      ]
    }
  });
  console.log('   Metadata URI:',uri);
  return uri;  
}

async function mintNft(metadataUri: string, name: string, sellerFee: number, symbol: string, creators: {address: PublicKey, share: number}[]) {
  console.log(`Step 3 - NFT 민팅 시작`);

  const { nft } = await METAPLEX
  .nfts()
  .create({
      uri: metadataUri,
      name: name,
      sellerFeeBasisPoints: sellerFee,
      symbol: symbol,
      creators: creators,
      isMutable: false,
      maxSupply: toBigNumber(1)
  });
  console.log(`   성공!🎉`);
  console.log(`   발행된 NFT: https://explorer.solana.com/address/${nft.address}?cluster=devnet`);
  console.log(`   발행된 NFT: https://solscan.io/token/${nft.address}?cluster=devnet`);
}


async function main() {
  console.log(`NFT 명 : ${CONFIG.imgName}, 내 지갑 주소 : ${WALLET.publicKey.toBase58()}.`);
  //Step 1 - 이미지 업로드
  const imgUri = await uploadImage(CONFIG.uploadPath, CONFIG.imgFileName);
  //Step 2 - 메타데이터 업로드
  const metadataUri = await uploadMetadata(imgUri, CONFIG.imgType, CONFIG.imgName, CONFIG.description, CONFIG.attributes); 
  //Step 3 - NFT 민팅
  mintNft(metadataUri, CONFIG.imgName, CONFIG.sellerFeeBasisPoints, CONFIG.symbol, CONFIG.creators);
}

main();