import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./ProfilePage.css";
import toast from "react-hot-toast";
import { useWallet } from "@tronweb3/tronwallet-adapter-react-hooks";
import { WalletActionButton } from "@tronweb3/tronwallet-adapter-react-ui";
import "@tronweb3/tronwallet-adapter-react-ui/style.css";
import Datacontext from "../datacontext";
import { useContext } from "react";
import CryptoJS from "crypto-js";
import TransactionModal from "./TransactionModal";
import logo from './images/tronenticon5.svg';

// Key for encryption and decryption (must be kept secret)
const secretKey = "sehajjain";

// Function to encrypt data
const encryptData = (data) => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), secretKey).toString();
};

// Function to decrypt data
const decryptData = (cipherText) => {
  const bytes = CryptoJS.AES.decrypt(cipherText, secretKey);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

// const samplieCID="QmYkHHbyJLZR13j7T16VmroSHvkLAf5uXbztFgJTkDKyEP";
const ProfilePage = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { projects, setProjects } = useContext(Datacontext);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isProjectDetailsModalOpen, setIsProjectDetailsModalOpen] =
    useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [customFileNames, setCustomFileNames] = useState([]); // State for custom file names
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [currentProject, setCurrentProject] = useState(null);
  const { address, connected, connect, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);

  // Add state for transaction modal visibility and success status
  const [isTransactionModalVisible, setIsTransactionModalVisible] =
    useState(false);
  const [transactionSuccess, setTransactionSuccess] = useState(false);

  // Function to close the modal
  const closeTransactionModal = () => {
    setIsTransactionModalVisible(false);
  };
  // Load projects from localStorage on component mount
  useEffect(() => {
    const savedProjects = localStorage.getItem("projects");
    if (savedProjects) {
      try {
        // Decrypt the encrypted projects
        const decryptedProjects = decryptData(savedProjects);
        setProjects(decryptedProjects);
      } catch (error) {
        console.error("Failed to decrypt projects from localStorage:", error);
        localStorage.removeItem("projects"); // Remove corrupted data if any
      }
    }
  }, [setProjects]);

  // When saving projects, exclude the 'files' array from being saved in local storage
  useEffect(() => {
    // Sync projects state to localStorage with AES encryption
    if (projects.length > 0) {
      const encryptedProjects = encryptData(projects);
      localStorage.setItem("projects", encryptedProjects);
    }
  }, [projects]); // This effect will run every time `projects` changes

  const navigate = useNavigate();

  const toggleUploadModal = () => {
    setIsUploadModalOpen(!isUploadModalOpen);
    setSelectedFiles([]);
    setCustomFileNames([]); // Reset custom file names
    setMessage("");
  };

  const toggleCreateFolderModal = () => {
    setIsCreateFolderModalOpen(!isCreateFolderModalOpen);
    setProjectName("");
  };

// Close the modal when returning from SunSwap
useEffect(() => {
  const handleWindowFocus = () => {
    if (isTransactionModalVisible) {
      setIsTransactionModalVisible(false);
    }
  };

  window.addEventListener("focus", handleWindowFocus);

  return () => {
    window.removeEventListener("focus", handleWindowFocus);
  };
}, [isTransactionModalVisible]);
  
  const openProjectDetailsModal = async (project) => {
    setCurrentProject(project);
    setIsProjectDetailsModalOpen(true);
    // try {
    // setLoading(true);
    //     {loading && <span className="loading-spinner"></span>}
    //   // Fetch the files for the project based on the project ID or any identifier
    //   // const response = await axios.get(`http://localhost:4040/getFiles?projectId=${project.id}`);
    //   // const fetchedFiles = response.data.files;

    //   // Update the current project with fetched files
    //   setCurrentProject((prevProject) => ({
    //     ...prevProject,
    //     files: fetchedFiles,
    //   }));
    // } catch (error) {
    //   console.error('Error fetching files:', error);
    // } finally {
    //   setLoading(false);
    // }
  };

  const closeProjectDetailsModal = () => {
    setIsProjectDetailsModalOpen(false);
    setCurrentProject(null);
  };

  const searchProjects = (projects) => {
    return projects.filter((project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
    setCustomFileNames(Array(files.length).fill("")); // Initialize custom file names array
  };

  const handleCustomNameChange = (index, value) => {
    const updatedNames = [...customFileNames];
    updatedNames[index] = value;
    setCustomFileNames(updatedNames);
  };
  const checkBalance = async () => {
    if (!address) {
      setMessage("Please connect your wallet first.");
      return;
    }

    const requiredBalance = 20;

    try {
      const response = await axios.post("http://localhost:4040/checkBalance", {
        requiredBalance,
      });

      if (response.data.status === "success") {
        setMessage("Sufficient balance");
      } else {
        setMessage("Insufficient balance");
      }
    } catch (error) {
      console.error("Error checking balance:", error);
      setMessage("Error checking balance");
    }
  };
  const triggerTransaction = async (latest2cid) => {
    if (!connected) {
      setMessage("Please connect your wallet first.");
      return;
    }

    try {
      const contractAddress = "TGXJVSgz4KyAKKQeZ1Gy2EmMYSueKWLGYp";
      const contract = await window.tronWeb.contract().at(contractAddress);

      // Sending 20 TRX to the contract for the operation
      const trxAmount = 20; // Amount the user is paying
      const callValue = window.tronWeb.toSun(20); // Convert to Sun (smallest unit of TRX)

      const transaction = await contract.uploadfile(latest2cid).send({
        feeLimit: 100000000,
        callValue: callValue,
      });

      // If transaction succeeds, show success modal
      setTransactionSuccess(true);
      setIsTransactionModalVisible(true); // Open the modal
      console.log("https://nile.tronscan.org/#/transaction/" + transaction);

      const excessAmount = window.tronWeb.toSun(trxAmount) - callValue;

      if (excessAmount > 0) {
        await axios.post("http://localhost:4040/sendExcessTrx", {
          fromAddress: address,
          amount: excessAmount,
        });
      }

      setMessage("Transaction successful");
      return true;
    } catch (error) {
      console.error("Error triggering transaction:", error);

      // If transaction fails, show failure modal
      setTransactionSuccess(false);
      setIsTransactionModalVisible(true); // Open the modal
      setMessage("Transaction failed");
      return false;
    }
  };

  const handleFileUpload = async () => {
    if (selectedFiles.length > 0 && currentProject) {
      setIsUploading(true);
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));

      try {
        const responses = await Promise.all(
          selectedFiles.map((file) =>
            axios.post("http://localhost:4040/upload", formData, {
              headers: { "Content-Type": "multipart/form-data" },
            })
          )
        );

        const latestCid = responses[responses.length - 1].data.cid;
        console.log("latestCid:", latestCid);

        // Trigger the transaction
        const transactionSuccessful = await triggerTransaction(latestCid);

        if (transactionSuccessful) {
          // Map the responses to include custom file names and CID
          const uploadedFilesWithCIDs = responses.map((response, index) => ({
            name: customFileNames[index] || response.data.originalFilename,
            cid: response.data.cid,
          }));

          const updatedProject = {
            ...currentProject,
            files: [...currentProject.files, ...uploadedFilesWithCIDs],
          };

          setProjects((prevProjects) =>
            prevProjects.map((project) =>
              project.id === currentProject.id ? updatedProject : project
            )
          );
          setCurrentProject(updatedProject);

          // Set the modal to show success
          setTransactionSuccess(true);
        } else {
          // Set the modal to show failure
          setTransactionSuccess(false);
        }

        // Show the transaction modal
        setIsTransactionModalVisible(true);
      } catch (error) {
        setMessage("Error uploading files.");
        console.error("File upload error:", error);
      } finally {
        setIsUploading(false);
      }
    } else {
      setMessage("Please select files and choose a project to upload to.");
    }
  };

  const handleCreateFolder = () => {
    if (projectName.trim() !== "") {
      const newProject = {
        id: Date.now(),
        name: projectName,
        files: [],
      };

      setProjects((prevProjects) => [...prevProjects, newProject]);
      setProjectName("");
      toast.success("Project folder created successfully!");
      toggleCreateFolderModal();
    } else {
      toast.error("Please enter a project name.");
    }
  };

  const handleFileClick = async (cid, fileName) => {
    try {
      const response = await axios({
        url: `http://localhost:4040/getfile?cid=${cid}`,
        method: "GET",
        responseType: "blob",
      });

      const fileType = response.headers["content-type"];
      const blob = new Blob([response.data], { type: fileType });
      const fileURL = window.URL.createObjectURL(blob);

      if (fileType.startsWith("image/") || fileType === "application/pdf") {
        window.open(fileURL, "_blank");
      } else {
        const a = document.createElement("a");
        a.href = fileURL;
        a.download = fileName; // Use the fileName from the clicked file
        a.click();
      }
    } catch (error) {
      console.error("Error fetching file:", error);
    }
  };

  const handleDeleteProject = (id) => {
    const updatedProjects = projects.filter((project) => project.id !== id);
    setProjects(updatedProjects);
    toast.success("Project deleted successfully!");
  };

  const handleDeleteFile = (fileIndex) => {
    if (currentProject) {
      const updatedFiles = currentProject.files.filter(
        (_, index) => index !== fileIndex
      );
      const updatedProject = {
        ...currentProject,
        files: updatedFiles,
      };

      // Update the current project and the projects state
      setCurrentProject(updatedProject);
      setProjects((prevProjects) =>
        prevProjects.map((project) =>
          project.id === currentProject.id ? updatedProject : project
        )
      );

      toast.success("File deleted successfully!");
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
    setCustomFileNames((prevNames) => [
      ...prevNames,
      ...Array(files.length).fill(""),
    ]); // Update custom names
  };

  return (
    <div className="profile-page">
      <div className="navigation-bar">
        <div className="navigation-bar-content">
        <div className="icon">
  <img src={logo} alt="Logo" className="logo-image" />
</div>

          <div className="button-group2">
            <button className="home-page-btn" onClick={() => navigate("/")}>
              Home Page
            </button>
            <button onClick={toggleCreateFolderModal} className="home-page-btn">
              Create Folder
            </button>
          </div>
        </div>
      </div>

      <div className="explorer">
        <div className="explorer-navigation">
          <div className="title">Your Projects</div>
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search Projects"
              className="search-input"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="files-display">
          {projects.length === 0 ? (
            <div className="no-files">No files to display</div>
          ) : (
            searchProjects(projects).map((project) => (
              <div
                key={project.id}
                className="project-card"
                onClick={() => openProjectDetailsModal(project)}
              >
                <div className="project-name">{project.name}</div>
                <div
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProject(project.id);
                  }}
                >
                  <span className="delete-text">&#10005;</span>
                  <span className="hover-delete-text">Delete</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal for Project Details */}
      {isProjectDetailsModalOpen && currentProject && (
        <div className="modal-overlay">
          <div className="modal-content1">
            <h2>{currentProject.name}</h2>
            <ul className="file-list">
              {currentProject.files.map((file, index) => (
                <li key={index} className="file-item">
                  <span
                    className="file-name"
                    onClick={() => handleFileClick(file.cid, file.name)}
                  >
                    {file.name}
                  </span>
                  {/* Add delete button */}
                  <span
                    className="delete-text"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering file click event
                      handleDeleteFile(index); // Call the file deletion handler
                    }}
                  >
                    &#10005;
                  </span>
                  <span className="hover-delete-text">Delete</span>
                </li>
              ))}
            </ul>

            <div>
              <button onClick={toggleUploadModal} className="choose-files-btn">
                Upload New File
              </button>
            </div>
            <button onClick={closeProjectDetailsModal} className="close-btn1">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Modal for Upload */}
      {isUploadModalOpen && (
        <div className="modal-overlay">
          <div
            className="modal-content1 upload-modal"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <h2>Upload your new Files here!</h2>
            <div>
              <button
                onClick={() => document.getElementById("fileInput").click()}
                className="choose-files-btn"
              >
                Choose Files
              </button>
              <input
                type="file"
                id="fileInput"
                multiple
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <div className={`drag-drop-area ${dragging ? "dragging" : ""}`}>
                Drag & Drop files here
              </div>
            </div>
            {selectedFiles.length > 0 && (
              <div className="file-list">
                <h3>Selected Files:</h3>
                <ul>
                  {Array.from(selectedFiles).map((file, index) => (
                    <li className="file-uploaded-name" key={index}>
                      {file.name}
                      <input
                        type="text"
                        placeholder="Enter file name"
                        value={customFileNames[index]}
                        onChange={(e) =>
                          handleCustomNameChange(index, e.target.value)
                        }
                        className="file-upload-name"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button onClick={handleFileUpload} className="upload-btn">
              Upload
              {isUploading && <span className="loading-spinner"></span>}
            </button>
            {message && <p className="message">{message}</p>}
            <button onClick={toggleUploadModal} className="close-btn1">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Include the modal */}
      <TransactionModal
        isVisible={isTransactionModalVisible}
        isSuccess={transactionSuccess}
        onClose={() => setIsTransactionModalVisible(false)}
      />

      {/* Modal for Create Folder */}
      {isCreateFolderModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content1">
            <h2>Create a New Folder</h2>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter Folder Name"
              className="folder-input file-upload-name"
            />
            <button onClick={handleCreateFolder} className="create-folder-btn">
              Create Folder
            </button>
            <button onClick={toggleCreateFolderModal} className="close-btn1">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
