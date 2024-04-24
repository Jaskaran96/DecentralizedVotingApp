import React, { useState } from "react";
import Web3Modal from "web3modal";
import { ethers } from "ethers";

import { votingAddress, votingAddressABI } from "./constants";

const getContract = (sOrP) =>
  new ethers.Contract(votingAddress, votingAddressABI, sOrP);
const timerTime = Date.now();
export const VotingContext = React.createContext();
export const VotingProvider = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState("");
  const [candidateArray, setCandidateArray] = useState([]);
  const [votingEnd, setVotingEnd] = useState(false);
  const [error, setError] = useState("");
  const [winners, setWinners] = useState([]);

  const [voterArray, setVoterArray] = useState([]);
  const [voterAddress, setVoterAddress] = useState([]);

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        return setError("Please install metamask!");
      }
      const acc = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setCurrentAccount(acc[0]);
    } catch (error) {
      setError("Failed to connect wallet!");
    }
  }

  async function authContract() {
    try {
      const web3Modal = new Web3Modal();
      const con = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(con);
      const signer = provider.getSigner();
      const contract = getContract(signer);
      return contract;
    } catch (err) {
      console.log("ERR is auth contract");
      console.log(err);
      return;
    }
  }

  function checkVoterExists(votAddress) {
    const voterExists = voterAddress.filter((voter) => voter === votAddress);
    return voterExists.length > 0;
  }

  function checkCandidateExists(candidateAddress) {
    const candidateExists = candidateArray.filter(
      (candidate) => candidate[5] === candidateAddress
    );
    return candidateExists.length > 0;
  }

  async function addVoter(inputForm, fileUrl, router) {
    try {
      const { name, address, age, remark } = inputForm;
      if (checkVoterExists(address)) {
        return alert("Voter already exists!");
      }
      if (!name || !address || !age || !remark) {
        return alert("Please fill all the fields!");
      }

      const contract = await authContract();

      const voter = await contract.addVoter(
        name,
        fileUrl,
        address,
        remark,
        age
      );

      await voter.wait();
      router.push("/voterList");
      allVoterData();
    } catch (err) {
      console.log(err);
    }
  }

  async function allVoterData(force = false) {
    const contract = await authContract();
    const voterDataAddresses = await contract.readAllVoters();
    setVoterAddress(voterDataAddresses);

    const promises = voterDataAddresses.map(async (voter) => {
      return await contract.readVoterData(voter);
    });
    const voterDataArray = await Promise.all(promises);
    console.log("eneted voter array");
    if (voterDataArray.length > voterArray.length || force) {
      console.log("insie");
      setVoterArray(voterDataArray);
    }
  }

  async function addVote(candidateId, candidateAddress) {
    const contract = await authContract();
    const voterData = await contract.readVoterData(currentAccount);
    console.log(voterData);
    if (voterData[0] === "") {
      alert(
        "Your voting profile does not exist, ask the organizer to add you!"
      );

      return;
    }
    if (voterData[3]) {
      return alert("You have already voted!");
    }
    const vote = await contract.addVote(candidateId, candidateAddress);
    console.log(vote);
    alert("voted");
    allVoterData(true);
    allCandidateData(true);
  }

  async function addCandidate(inputForm, fileUrl, router) {
    try {
      const { name, address, age, moto } = inputForm;
      if (checkCandidateExists(address)) {
        return alert("Candidate already exists!");
      }
      if (!name || !address || !age || !moto) {
        return alert("Please fill all the fields!");
      }

      const contract = await authContract();

      const candidate = await contract.addCandidate(
        age,
        name,
        fileUrl,
        address,
        moto
      );
      await candidate.wait();
      router.push("/");
      allCandidateData();
    } catch (err) {
      console.log(err);
    }
  }

  async function allCandidateData(force = false) {
    const contract = await authContract();
    const candidateAddress = await contract.readAllAddress();

    const promises = candidateAddress.map(async (candidate) => {
      return await contract.readCandidateData(candidate);
    });
    const candidateDataArray = await Promise.all(promises);

    if (candidateDataArray.length > candidateArray.length || force) {
      setCandidateArray(candidateDataArray);
    }
  }

  async function findWinner() {
    await allCandidateData();
    let highCount = 0;
    let localWinners = [];
    for (let i = 0; i < candidateArray.length; i++) {
      const curCandidatEvote = candidateArray[i][4].toNumber();
      if (curCandidatEvote > highCount) {
        highCount = curCandidatEvote;
      }
    }
    console.log(`highcount is ${highCount}`);
    for (let i = 0; i < candidateArray.length; i++) {
      const curCandidatEvote = candidateArray[i][4].toNumber();
      if (curCandidatEvote === highCount && highCount > 0) {
        highCount = curCandidatEvote;
        localWinners.push(candidateArray[i]);
      }
    }
    setWinners(localWinners);
    setVotingEnd(true);
  }

  return (
    <VotingContext.Provider
      value={{
        error,
        winners,
        currentAccount,
        candidateArray,
        voterArray,
        timerTime,
        voterAddress,
        votingEnd,
        connectWallet,
        findWinner,
        addVoter,
        allVoterData,
        addVote,
        addCandidate,
        allCandidateData,
      }}
    >
      {children}
    </VotingContext.Provider>
  );
};
