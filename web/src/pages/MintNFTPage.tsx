import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  ArrowRight,
  HardDrive,
  Coins,
} from 'lucide-react';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '../config/contracts';
import { APP_CONFIG } from '../config/appConfig';
import { uploadNFTToPinata, PINATA_GATEWAY } from '../lib/ipfs';

export const MintNFTPage: React.FC = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();

  // Form states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [name, setName] = useState<string>('Botchain Genesis Collectible');
  const [description, setDescription] = useState<string>(
    'Exclusive decentralized NFT minted on Botchain Testnet and pinned to Pinata IPFS.'
  );
  const [attributes, setAttributes] = useState<Array<{ trait_type: string; value: string }>>([
    { trait_type: 'Network', value: 'Botchain Testnet' },
    { trait_type: 'Rarity', value: 'Legendary' },
  ]);

  // Upload & Mint status
  const [uploadStep, setUploadStep] = useState<'idle' | 'uploading-ipfs' | 'uploaded-ipfs' | 'minting' | 'success'>('idle');
  const [uploadedTokenURI, setUploadedTokenURI] = useState<string>('');
  const [uploadedImageHash, setUploadedImageHash] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Wagmi Mint Contract Write
  const { data: mintHash, writeContract, isPending: isMintPending } = useWriteContract();
  const { isLoading: isConfirmingMint, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({
    hash: mintHash,
  });

  React.useEffect(() => {
    if (isMintSuccess) {
      setUploadStep('success');
    }
  }, [isMintSuccess]);

  // Handle file picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setErrorMessage(null);
    }
  };

  // Add/remove attribute
  const handleAddAttribute = () => {
    setAttributes([...attributes, { trait_type: '', value: '' }]);
  };

  const handleRemoveAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleUpdateAttribute = (index: number, field: 'trait_type' | 'value', val: string) => {
    const updated = [...attributes];
    updated[index][field] = val;
    setAttributes(updated);
  };

  // Step 1: Upload to Pinata IPFS
  const handleUploadToPinata = async () => {
    setErrorMessage(null);
    if (!imageFile) {
      setErrorMessage('Please select an image file to upload.');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Please enter an NFT name.');
      return;
    }

    try {
      setUploadStep('uploading-ipfs');

      const filteredAttributes = attributes.filter(
        (a) => a.trait_type.trim() && a.value.trim()
      );

      const result = await uploadNFTToPinata(imageFile, {
        name,
        description,
        attributes: filteredAttributes,
      });

      setUploadedTokenURI(result.tokenURI);
      setUploadedImageHash(result.imageHash);
      setUploadStep('uploaded-ipfs');
    } catch (err: any) {
      console.error('IPFS Upload Error:', err);
      setErrorMessage(err?.message || 'Failed to upload NFT to Pinata IPFS.');
      setUploadStep('idle');
    }
  };

  // Step 2: Mint onchain via TestERC721.mint(tokenURI)
  const handleMintOnchain = () => {
    setErrorMessage(null);
    if (!uploadedTokenURI) {
      setErrorMessage('Please upload to IPFS first.');
      return;
    }

    try {
      setUploadStep('minting');
      writeContract({
        address: CONTRACT_ADDRESSES.testERC721,
        abi: CONTRACT_ABIS.TestERC721,
        functionName: 'mint',
        args: [uploadedTokenURI],
      });
    } catch (err: any) {
      console.error('Minting Error:', err);
      setErrorMessage(err?.message || 'Failed to trigger onchain mint transaction.');
      setUploadStep('uploaded-ipfs');
    }
  };

  const explorerUrl = APP_CONFIG.network.blockExplorerUrl;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold">
          <HardDrive className="w-3.5 h-3.5" />
          <span>Pinata IPFS Service & ERC-721 Minting</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Mint NFT to <span className="text-brand-400">Pinata IPFS</span>
        </h1>
        <p className="text-slate-400 text-sm">
          Upload media and metadata to Pinata IPFS with CIDv1 pinning, then mint directly to Botchain testnet.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left: Media Upload & Preview (5 cols) */}
        <div className="md:col-span-5 space-y-4">
          <div className="glass-panel rounded-3xl p-5 border border-dark-800 space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              NFT Asset Media
            </label>

            <div className="relative aspect-square w-full rounded-2xl bg-dark-950 border-2 border-dashed border-dark-700 hover:border-brand-500/50 transition-colors flex flex-col items-center justify-center p-4 text-center cursor-pointer overflow-hidden group">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />

              {imagePreview ? (
                <div className="relative w-full h-full">
                  <img
                    src={imagePreview}
                    alt="NFT Preview"
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <div className="absolute inset-0 bg-dark-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold">
                    Click to change image
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-dark-850 flex items-center justify-center mx-auto text-brand-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white block">
                      Choose an image or drop here
                    </span>
                    <span className="text-xs text-slate-500 mt-1 block">
                      PNG, JPG, GIF, SVG up to 50MB
                    </span>
                  </div>
                </div>
              )}
            </div>

            {imageFile && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-dark-900 border border-dark-800 text-xs">
                <div className="flex items-center space-x-2 truncate">
                  <ImageIcon className="w-4 h-4 text-brand-400 shrink-0" />
                  <span className="text-slate-200 truncate">{imageFile.name}</span>
                </div>
                <span className="text-slate-500 font-mono shrink-0">
                  {(imageFile.size / 1024).toFixed(1)} KB
                </span>
              </div>
            )}
          </div>

          {/* Pinata Gateway info */}
          <div className="p-4 rounded-2xl bg-dark-900/60 border border-dark-800 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center space-x-2 text-slate-200 font-semibold">
              <HardDrive className="w-3.5 h-3.5 text-brand-400" />
              <span>Decentralized Storage Guarantee</span>
            </div>
            <p>
              Uploaded assets are pinned with <strong>CID version 1</strong> across Pinata Frankfurt & New York IPFS nodes for instant global replication.
            </p>
          </div>
        </div>

        {/* Right: Metadata Details & Minting Flow (7 cols) */}
        <div className="md:col-span-7 space-y-6">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-dark-800 space-y-5">
            {/* NFT Name */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                NFT Name
              </label>
              <input
                type="text"
                placeholder="e.g. Botchain Cosmic Blade"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-dark-950 border border-dark-700 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Describe your NFT..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl bg-dark-950 border border-dark-700 px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Attributes / Traits */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold uppercase tracking-wider text-slate-300">
                  Traits & Attributes
                </label>
                <button
                  type="button"
                  onClick={handleAddAttribute}
                  className="flex items-center space-x-1 text-brand-400 hover:text-brand-300 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Trait</span>
                </button>
              </div>

              <div className="space-y-2">
                {attributes.map((attr, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Trait (e.g. Type)"
                      value={attr.trait_type}
                      onChange={(e) =>
                        handleUpdateAttribute(index, 'trait_type', e.target.value)
                      }
                      className="flex-1 rounded-xl bg-dark-950 border border-dark-700 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. Gold)"
                      value={attr.value}
                      onChange={(e) =>
                        handleUpdateAttribute(index, 'value', e.target.value)
                      }
                      className="flex-1 rounded-xl bg-dark-950 border border-dark-700 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveAttribute(index)}
                      className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Error Display */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* IPFS Upload Result Summary */}
            {uploadedTokenURI && (
              <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-xs space-y-2 text-slate-300">
                <div className="flex items-center space-x-2 text-brand-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Metadata Successfully Pinned to Pinata IPFS!</span>
                </div>
                <div className="font-mono text-[11px] truncate text-slate-400">
                  URI: {uploadedTokenURI}
                </div>
                <a
                  href={`${PINATA_GATEWAY.replace(/\/+$/, '')}/${uploadedImageHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>View Asset on Pinata Gateway</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Success Modal / Banner */}
            {uploadStep === 'success' ? (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-brand-950 to-dark-900 border border-brand-500/40 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">NFT Minted Successfully!</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Your NFT is live on Botchain testnet with permanent Pinata IPFS metadata.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <Link
                    to="/create"
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/20"
                  >
                    <span>List for Auction on Lightbid</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  {mintHash && (
                    <a
                      href={`${explorerUrl}/tx/${mintHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-300 text-xs font-semibold border border-dark-700 flex items-center justify-center space-x-1"
                    >
                      <span>Explorer Receipt</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ) : (
              /* Two-Step Action: Step 1 Upload to IPFS -> Step 2 Mint Onchain */
              <div className="pt-4 border-t border-dark-800 flex flex-col sm:flex-row items-center gap-3">
                {uploadStep !== 'uploaded-ipfs' && uploadStep !== 'minting' ? (
                  <button
                    onClick={handleUploadToPinata}
                    disabled={uploadStep === 'uploading-ipfs' || !imageFile}
                    className="w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-950 font-extrabold text-sm uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/20"
                  >
                    {uploadStep === 'uploading-ipfs' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading to Pinata IPFS...</span>
                      </>
                    ) : (
                      <>
                        <HardDrive className="w-4 h-4" />
                        <span>1. Pin to IPFS</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleMintOnchain}
                    disabled={isMintPending || isConfirmingMint || !isConnected}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-500 to-emerald-400 hover:from-brand-400 hover:to-emerald-300 text-dark-950 font-extrabold text-sm uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/20"
                  >
                    {isMintPending || isConfirmingMint ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Minting on Botchain...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>2. Mint NFT Onchain</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
