const CONTRACT =
"0xd5F4157Af80AacEd1ef5dc1a6b548f3CDA5A45A5";

const NFT_URI =
"ipfs://QmbCTnJTJb46b4Z6skPXGBSeXfu9aMSdqe5hE9TwyrJukt";

let signer;
let contract;

async function loadABI() {

  const res =
    await fetch("./abi.json");

  return await res.json();

}

async function connectWallet() {

  if(!window.ethereum){

    alert("Install MetaMask");

    return;

  }

  try{

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

  }

}

document
.getElementById("connectBtn")
.onclick = connectWallet;

document
.getElementById("signBtn")
.onclick = async () => {

  try{

    const message =
      document
      .getElementById("message")
      .value;

    if(!message){

      alert("Enter message");

      return;

    }

    const tx =
      await contract.signGuestbook(
        message,
        NFT_URI
      );

    document
      .getElementById("status")
      .innerText =
      "Transaction sent...";

    await tx.wait();

    document
      .getElementById("status")
      .innerText =
      "NFT Minted 🎉";

    loadEntries();

  }

  catch(err){

    console.error(err);

    document
      .getElementById("status")
      .innerText =
      "Transaction Failed";

  }

};

async function loadEntries(){

  try{

    const total =
      await contract.totalEntries();

    const container =
      document.getElementById(
        "entries"
      );

    container.innerHTML = "";

    for(
      let i =
      Number(total)-1;
      i >= 0;
      i--
    ){

      const entry =
        await contract.getEntry(i);

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "entry";

      div.innerHTML =
      `
      <p>${entry[1]}</p>
      <small>
      ${entry[0]}
      </small>
      `;

      container.appendChild(div);

      if(container.children.length >= 20)
      break;

    }

  }

  catch(err){

    console.log(err);

  }

}
