// ============================================
// IOPN LUCKY GUESTBOOK — APP V4
// ============================================

const CONTRACT = "0xd5F4157Af80AacEd1ef5dc1a6b548f3CDA5A45A5";
const NFT_URI = "ipfs://QmbCTnJTJb46b4Z6skPXGBSeXfu9aMSdqe5hE9TwyrJukt";
const NFT_GATEWAY = "https://gateway.pinata.cloud/ipfs/QmbCTnJTJb46b4Z6skPXGBSeXfu9aMSdqe5hE9TwyrJukt";

// IOPN Network
const IOPN_NETWORK = {
  chainId: "0x3D8",
  chainName: "IOPN Testnet",
  nativeCurrency: { name: "IOPN", symbol: "IOPN", decimals: 18 },
  rpcUrls: ["https://testnet-rpc.iopn.tech"],
  blockExplorerUrls: ["https://testnet.iopn.tech"]
};
const IOPN_CHAIN_ID = 984;

let signer, contract, provider;

// ============================================
// TOAST SYSTEM
// ============================================
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || "ℹ️"}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("removing");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============================================
// LOAD ABI
// ============================================
async function loadABI() {
  const res = await fetch("./abi.json");
  return await res.json();
}

// ============================================
// WALLET MODAL
// ============================================
const walletModal = document.getElementById("walletModal");
const connectBtn = document.getElementById("connectBtn");
const heroConnectBtn = document.getElementById("heroConnectBtn");
const closeModalBtn = document.getElementById("closeModal");
const modalBackdrop = document.getElementById("modalBackdrop");

function openModal() { walletModal.classList.add("active"); }
function closeModal() { walletModal.classList.remove("active"); }

connectBtn.addEventListener("click", openModal);
heroConnectBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);

document.querySelectorAll(".wallet-option").forEach(btn => {
  btn.addEventListener("click", () => {
    const walletType = btn.dataset.wallet;
    closeModal();
    connectWallet(walletType);
  });
});

// ============================================
// CHECK NETWORK
// ============================================
async function checkNetwork() {
  if (!window.ethereum && !window.okxwallet) return false;
  try {
    const eth = window.okxwallet || window.ethereum;
    const chainId = await eth.request({ method: "eth_chainId" });
    const current = parseInt(chainId, 16);
    if (current !== IOPN_CHAIN_ID) {
      document.getElementById("wrongNetwork").style.display = "block";
      return false;
    }
    document.getElementById("wrongNetwork").style.display = "none";
    return true;
  } catch { return false; }
}

// ============================================
// SWITCH NETWORK
// ============================================
async function switchToIOPN() {
  const eth = window.okxwallet || window.ethereum;
  if (!eth) return;
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: IOPN_NETWORK.chainId }] });
    showToast("Switched to IOPN Testnet!", "success");
  } catch (err) {
    if (err.code === 4902) {
      try {
        await eth.request({ method: "wallet_addEthereumChain", params: [IOPN_NETWORK] });
        showToast("IOPN Testnet added!", "success");
      } catch {
        showToast("Could not add IOPN network", "error");
      }
    }
  }
  checkNetwork();
}

document.getElementById("switchNetworkBtn").addEventListener("click", switchToIOPN);

// Listen for changes
if (window.ethereum) {
  window.ethereum.on("chainChanged", () => {
    checkNetwork();
    if (contract) loadEntries();
  });
  window.ethereum.on("accountsChanged", () => window.location.reload());
}

// ============================================
// CONNECT WALLET
// ============================================
async function connectWallet(walletType) {
  let eth = null;

  if (walletType === "metamask") {
    eth = window.ethereum?.isMetaMask ? window.ethereum : window.ethereum;
  } else if (walletType === "okx") {
    eth = window.okxwallet || null;
  } else {
    eth = window.ethereum || window.okxwallet || null;
  }

  if (!eth) {
    showToast("Wallet not detected. Install MetaMask or OKX Wallet.", "error");
    return;
  }

  try {
    provider = new ethers.BrowserProvider(eth);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    const address = await signer.getAddress();

    const short = address.slice(0, 6) + "..." + address.slice(-4);
    connectBtn.innerHTML = '<span class="btn-pulse"></span><span class="btn-label">' + short + '</span>';
    connectBtn.classList.add("connected");
    heroConnectBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M15 6V3H12M3 12V15H6M15 3L10 8M3 15L8 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      ` + short;

    showToast(`Connected: ${short}`, "success");

    const isCorrect = await checkNetwork();
    if (!isCorrect) await switchToIOPN();

    const abi = await loadABI();
    contract = new ethers.Contract(CONTRACT, abi, signer);
    loadEntries();

  } catch (err) {
    console.error("Connection failed:", err);
    showToast("Connection failed. Try again.", "error");
  }
}

// ============================================
// CHARACTER COUNTER
// ============================================
const messageInput = document.getElementById("message");
const charCount = document.getElementById("charCount");
messageInput.addEventListener("input", () => {
  charCount.textContent = messageInput.value.length;
});

// ============================================
// SIGN GUESTBOOK
// ============================================
document.getElementById("signBtn").addEventListener("click", async () => {
  try {
    if (!contract) {
      showToast("Connect your wallet first!", "error");
      return;
    }

    const message = messageInput.value.trim();
    if (!message) {
      showToast("Write a message first!", "error");
      return;
    }

    const isCorrect = await checkNetwork();
    if (!isCorrect) {
      await switchToIOPN();
      return;
    }

    const status = document.getElementById("status");
    const signBtn = document.getElementById("signBtn");

    signBtn.disabled = true;
    signBtn.querySelector(".btn-text").textContent = "Confirming...";
    status.innerHTML = "";

    showToast("Waiting for wallet confirmation...", "info");

    const tx = await contract.signGuestbook(message, NFT_URI);

    signBtn.querySelector(".btn-text").textContent = "Transaction pending...";
    showToast("Transaction sent! Waiting for confirmation...", "info");

    const receipt = await tx.wait();

    status.innerHTML = `
      <div class="success-card">
        <h3>🎉 NFT Minted Successfully!</h3>
        <a href="https://testnet.iopn.tech/tx/${receipt.hash}" target="_blank">
          View Transaction →
        </a>
      </div>
    `;

    showToast("NFT Minted! 🎉", "success");

    messageInput.value = "";
    charCount.textContent = "0";
    signBtn.disabled = false;
    signBtn.querySelector(".btn-text").textContent = "Mint My NFT";

    loadEntries();

  } catch (err) {
    console.error("Transaction failed:", err);
    showToast("Transaction failed. Try again.", "error");
    document.getElementById("status").innerHTML = "❌ Transaction failed. Please try again.";
    const signBtn = document.getElementById("signBtn");
    signBtn.disabled = false;
    signBtn.querySelector(".btn-text").textContent = "Mint My NFT";
  }
});

// ============================================
// LOAD ENTRIES
// ============================================
async function loadEntries() {
  try {
    if (!contract) return;

    const loading = document.getElementById("loadingEntries");
    const emptyState = document.getElementById("emptyState");
    loading.style.display = "block";
    emptyState.style.display = "none";

    const total = await contract.totalEntries();
    const totalNum = Number(total);

    // Update all counters
    document.getElementById("totalSignatures").innerText = totalNum;
    document.getElementById("totalNFTs").innerText = totalNum;
    document.getElementById("participants").innerText = totalNum;
    document.getElementById("liveCount").innerText = totalNum;
    document.getElementById("heroCount").innerText = totalNum;

    const container = document.getElementById("entries");
    container.innerHTML = "";

    if (totalNum === 0) {
      loading.style.display = "none";
      emptyState.style.display = "block";
      return;
    }

    const maxEntries = Math.min(totalNum, 30);

    for (let i = totalNum - 1; i >= totalNum - maxEntries; i--) {
      if (i < 0) break;

      const entry = await contract.getEntry(i);
      const wallet = entry[0];
      const message = entry[1];
      const timestamp = Number(entry[2]);
      const tokenId = Number(entry[3]);

      const date = new Date(timestamp * 1000).toLocaleString();
      const shortWallet = wallet.slice(0, 6) + "..." + wallet.slice(-4);

      const div = document.createElement("div");
      div.className = "entry";
      div.style.animationDelay = `${(totalNum - 1 - i) * 0.05}s`;
      div.innerHTML = `
        <div class="entry-top">
          <div class="entry-user">
            <img src="${NFT_GATEWAY}" alt="NFT" class="entry-avatar"
              onerror="this.src='https://via.placeholder.com/40/0a1628/00c3ff?text=NFT'">
            <div class="entry-user-info">
              <span class="wallet">${shortWallet}</span>
              <br><small>Guestbook Member</small>
            </div>
          </div>
          <span class="token">NFT #${tokenId}</span>
        </div>
        <p class="entry-message">${escapeHtml(message)}</p>
        <div class="entry-bottom">
          <small>${date}</small>
          <a href="https://testnet.iopn.tech/address/${wallet}" target="_blank">Explorer →</a>
        </div>
      `;
      container.appendChild(div);
    }

    loading.style.display = "none";

  } catch (err) {
    console.error("Load entries error:", err);
    document.getElementById("loadingEntries").style.display = "none";
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Auto-refresh every 30s
setInterval(() => {
  if (contract) loadEntries();
}, 30000);

// Check network on load
if (window.ethereum || window.okxwallet) {
  checkNetwork();
}
