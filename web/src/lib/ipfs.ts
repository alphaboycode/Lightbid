/**
 * Pinata IPFS Service for Lightbid Marketplace
 * Handles file and JSON metadata uploads to Pinata IPFS with CIDv1,
 * and provides IPFS URI resolution to HTTP gateways.
 */

export const DEFAULT_PINATA_JWT =
  import.meta.env.VITE_PINATA_JWT ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI2OWY0YjNlMi01YzllLTQ5MmUtYjAyNC0yYjJjMTk3OWE4ODkiLCJlbWFpbCI6Im1sMzY0Njc0bGlmZUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiODljMWRkMDNkYzllOWI4NzMyYjgiLCJzY29wZWRLZXlTZWNyZXQiOiJhY2EyY2EwOWJmM2VlZTJmYTkwN2UxZTEzZDIzOTlkMGI1M2EyYTFiNjJmMzhjMmQ4OGVlNTg2MzJlODVkN2MzIiwiZXhwIjoxODI0OTM1NjYxfQ.cvVFqANdGRg1CiJFQH4J1E2aANSdarSqlGx7PaXjJ0M';

export const PINATA_GATEWAY =
  import.meta.env.VITE_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';

export interface PinataUploadResult {
  ipfsHash: string;
  ipfsUri: string;
  gatewayUrl: string;
}

export interface NFTMetadataInput {
  name: string;
  description: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
}

/**
 * Resolves an ipfs:// URI or gateway URL to a reachable HTTP URL.
 */
export function resolveIpfsUrl(url: string, gateway: string = PINATA_GATEWAY): string {
  if (!url) return '';
  const cleanGateway = gateway.replace(/\/+$/, '');
  if (url.startsWith('ipfs://')) {
    const cid = url.replace('ipfs://', '');
    return `${cleanGateway}/${cid}`;
  }
  if (url.startsWith('https://ipfs.io/ipfs/')) {
    const cid = url.replace('https://ipfs.io/ipfs/', '');
    return `${cleanGateway}/${cid}`;
  }
  return url;
}

/**
 * Upload an image or media file to Pinata IPFS using CIDv1.
 */
export async function uploadFileToPinata(
  file: File,
  jwt: string = DEFAULT_PINATA_JWT
): Promise<PinataUploadResult> {
  const token = jwt.trim();
  if (!token) {
    throw new Error('Pinata JWT is required for IPFS upload. Please set VITE_PINATA_JWT in .env');
  }

  const formData = new FormData();
  formData.append('file', file);

  const metadata = JSON.stringify({
    name: file.name || `lightbid-asset-${Date.now()}`,
    keyvalues: {
      app: 'lightbid-marketplace',
      timestamp: Date.now().toString(),
    },
  });
  formData.append('pinataMetadata', metadata);

  const options = JSON.stringify({
    cidVersion: 1,
  });
  formData.append('pinataOptions', options);

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload file to Pinata IPFS (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const ipfsHash = data.IpfsHash;
  const ipfsUri = `ipfs://${ipfsHash}`;
  const gatewayUrl = `${PINATA_GATEWAY.replace(/\/+$/, '')}/${ipfsHash}`;

  return { ipfsHash, ipfsUri, gatewayUrl };
}

/**
 * Upload JSON metadata to Pinata IPFS using CIDv1.
 */
export async function uploadJSONToPinata(
  content: Record<string, any>,
  jwt: string = DEFAULT_PINATA_JWT,
  name: string = `lightbid-metadata-${Date.now()}.json`
): Promise<PinataUploadResult> {
  const token = jwt.trim();
  if (!token) {
    throw new Error('Pinata JWT is required for IPFS upload. Please set VITE_PINATA_JWT in .env');
  }

  const payload = {
    pinataContent: content,
    pinataMetadata: {
      name,
      keyvalues: {
        app: 'lightbid-marketplace',
        type: 'erc721-metadata',
      },
    },
    pinataOptions: {
      cidVersion: 1,
    },
  };

  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload metadata to Pinata IPFS (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const ipfsHash = data.IpfsHash;
  const ipfsUri = `ipfs://${ipfsHash}`;
  const gatewayUrl = `${PINATA_GATEWAY.replace(/\/+$/, '')}/${ipfsHash}`;

  return { ipfsHash, ipfsUri, gatewayUrl };
}

/**
 * Complete NFT upload workflow:
 * 1. Uploads image file to Pinata IPFS -> receives image IPFS URI.
 * 2. Assembles ERC-721 metadata JSON including the image IPFS URI.
 * 3. Uploads metadata JSON to Pinata IPFS -> receives tokenURI (metadata IPFS URI).
 */
export async function uploadNFTToPinata(
  imageFile: File,
  metadata: NFTMetadataInput,
  jwt: string = DEFAULT_PINATA_JWT
): Promise<{
  tokenURI: string;
  imageURI: string;
  metadataHash: string;
  imageHash: string;
}> {
  // Step 1: Upload media file
  const imageUpload = await uploadFileToPinata(imageFile, jwt);

  // Step 2: Assemble ERC-721 compliant metadata
  const fullMetadata = {
    name: metadata.name.trim() || 'Lightbid Collectible',
    description: metadata.description.trim() || '',
    image: imageUpload.ipfsUri,
    attributes: metadata.attributes || [],
    external_url: 'https://scan.bohr.life',
  };

  // Step 3: Upload metadata JSON
  const metadataUpload = await uploadJSONToPinata(
    fullMetadata,
    jwt,
    `${(metadata.name || 'nft').toLowerCase().replace(/\s+/g, '-')}-metadata.json`
  );

  return {
    tokenURI: metadataUpload.ipfsUri,
    imageURI: imageUpload.ipfsUri,
    metadataHash: metadataUpload.ipfsHash,
    imageHash: imageUpload.ipfsHash,
  };
}
