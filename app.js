const CONTRACT =
"0xd5F4157Af80AacEd1ef5dc1a6b548f3CDA5A45A5";

const NFT_URI =
"ipfs://QmbCTnJTJb46b4Z6skPXGBSeXfu9aMSdqe5hE9TwyrJukt";

let signer;
let contract;

async function loadABI() {

  const res = await fetch("./abi.json");
  return await res.json();

}

async function connectWallet() {

  if (!window.ethereum) {

    alert("Install MetaMask / OKX Wallet");
    return;

  }

  try {

    const provider =
      new ethers.BrowserProvider(
        window.ethereum
      );

    await provider.send(
      "eth_requestAccounts",
      []
    );

    signer =
      await provider.getSigner();

    const address =
      await signer.getAddress();

    document
      .getElementById("connectBtn")
      .innerText =
      address.slice(0,6)
      + "..."
      +
      address.slice(-4);

    const abi =
      await loadABI();

    contract =
      new ethers.Contract(
        CONTRACT,
        abi,
        signer
      );

    loadEntries();

  }

  catch(err){

    console.error(err);

    alert(
      "Wallet connection failed"
    );

  }

}

document
.getElementById("connectBtn")
.onclick = connectWallet;

document
.getElementById("signBtn")
.onclick = async () => {

  try {

    if(!contract){

      alert(
        "Connect wallet first"
      );

      return;

    }

    const message =
      document
      .getElementById("message")
      .value
      .trim();

    if(!message){

      alert(
        "Write a message"
      );

      return;

    }

    const status =
      document.getElementById(
        "status"
      );

    status.innerHTML =
      "⏳ Waiting for wallet confirmation...";

    const tx =
      await contract.signGuestbook(
        message,
        NFT_URI
      );

    status.innerHTML =
      "🚀 Transaction sent...";

    const receipt =
      await tx.wait();

    status.innerHTML =
      `
      🎉 NFT Minted Successfully
      <br>
      Tx:
      <a
      href="https://testnet.iopn.tech/tx/${receipt.hash}"
      target="_blank"
      >
      View Transaction
      </a>
      `;

    document
      .getElementById("message")
      .value = "";

    loadEntries();

  }

  catch(err){

    console.error(err);

    document
      .getElementById("status")
      .innerHTML =
      "❌ Transaction Failed";

  }

};

async function loadEntries(){

  try{

    if(!contract) return;

    const total =
      await contract.totalEntries();

    const container =
      document.getElementById(
        "entries"
      );

    container.innerHTML = "";

    for(

      let i =
      Number(total) - 1;

      i >= 0;

      i--

    ){

      const entry =
        await contract.getEntry(i);

      const wallet =
        entry[0];

      const message =
        entry[1];

      const timestamp =
        Number(entry[2]);

      const tokenId =
        Number(entry[3]);

      const date =
        new Date(
          timestamp * 1000
        ).toLocaleString();

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "entry";

      div.innerHTML =
      `
      <div class="entry-top">

      <span class="wallet">

      ${wallet.slice(0,6)}
      ...
      ${wallet.slice(-4)}

      </span>

      <span class="token">

      NFT #${tokenId}

      </span>

      </div>

      <p class="entry-message">

      ${message}

      </p>

      <small>

      ${date}

      </small>

      <br>

      <a
      href="https://ipfs.io/ipfs/QmbCTnJTJb46b4Z6skPXGBSeXfu9aMSdqe5hE9TwyrJukt"
      target="_blank"
      >
      View NFT Metadata
      </a>

      `;

      container.appendChild(
        div
      );

      if(
        container.children.length >= 20
      )
      break;

    }

  }

  catch(err){

    console.log(err);

  }

}

setInterval(() => {

  if(contract){

    loadEntries();

  }

}, 30000);
