import React, { useState, useEffect, useCallback, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./ProfilePage.css";
import toast from "react-hot-toast";
import { useWallet } from "@tronweb3/tronwallet-adapter-react-hooks";
import "@tronweb3/tronwallet-adapter-react-ui/style.css";
import Datacontext from "../datacontext";
import TransactionModal from "./TransactionModal";
import logo from "./images/tronenticon5.svg";

const ProfilePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { projects, setProjects } = useContext(Datacontext);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isProjectDetailsModalOpen, setIsProjectDetailsModalOpen] =
    useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [currentProject, setCurrentProject] = useState(null);
  const { address } = useWallet();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [isTransactionModalVisible, setIsTransactionModalVisible] =
    useState(false);
  const [transactionSuccess, setTransactionSuccess] = useState(false);
  const closeTransactionModal = () => {
    setIsTransactionModalVisible(false);
  };
  const contractAddress = "TRQojfypg3RAjrsF4B2QPtJLcKbuwbBjFh";

  const loadProjectsFromBlockchain = useCallback(async () => {
    if (!address || !window.tronWeb) return;

    try {
      setLoading(true);
      const contract = await window.tronWeb.contract().at(contractAddress);
      const result = await contract.retrieveAllFoldersAndCIDs().call();
      const [folderNames, allCIDs] = result;

      const loadedProjects = await Promise.all(
        folderNames.map(async (name, index) => ({
          id: index,
          name: name,
          files: await Promise.all(
            allCIDs[index]
              .filter((cid) => cid !== "")
              .map(async (cid, fileIndex) => {
                try {
                  const response = await axios.get(
                    `http://localhost:4040/getfile?cid=${cid}`
                  );
                  return {
                    cid,
                    name: `${name} version ${fileIndex + 1}`,
                  };
                } catch (error) {
                  console.error("Error fetching file info:", error);
                  return { cid, name: `File from CID: ${cid}` };
                }
              })
          ),
        }))
      );

      setProjects(loadedProjects);
    } catch (error) {
      console.error("Error loading projects from blockchain:", error);
      toast.error("Failed to load projects from blockchain.");
    } finally {
      setLoading(false);
    }
  }, [address, setProjects]);

  useEffect(() => {
    loadProjectsFromBlockchain();
  }, [loadProjectsFromBlockchain]);

  const toggleUploadModal = () => {
    setIsUploadModalOpen(!isUploadModalOpen);
    setSelectedFiles([]);
    setMessage("");
  };

  const toggleCreateFolderModal = () => {
    setIsCreateFolderModalOpen(!isCreateFolderModalOpen);
    setProjectName("");
  };

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

  const openProjectDetailsModal = (project) => {
    setCurrentProject(project);
    setIsProjectDetailsModalOpen(true);
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
  };

  const handleCreateFolder = async () => {
    if (projectName.trim() !== "") {
      try {
        const contract = await window.tronWeb.contract().at(contractAddress);
        await contract.uploadFileToFolder(projectName, "").send({
          feeLimit: 100000000,
          callValue: 0,
        });

        await loadProjectsFromBlockchain();
        toast.success("Project folder created successfully!");
        toggleCreateFolderModal();
      } catch (error) {
        console.error("Error creating folder:", error);
        toast.error("Failed to create project folder.");
      }
    } else {
      toast.error("Please enter a project name.");
    }
  };

  const handleFileUpload = async () => {
    if (selectedFiles.length > 0 && currentProject) {
      setIsUploading(true);

      try {
        const responses = await Promise.all(
          selectedFiles.map((file) => {
            const formData = new FormData();
            formData.append("files", file);
            return axios.post("http://localhost:4040/upload", formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
          })
        );

        const contract = await window.tronWeb.contract().at(contractAddress);

        for (const response of responses) {
          await contract
            .uploadFileToFolder(currentProject.name, response.data.cid)
            .send({
              feeLimit: 100000000,
              callValue: window.tronWeb.toSun(20),
            });
        }
        setTransactionSuccess(true);
        setIsTransactionModalVisible(true);

        const newFiles = responses.map((response, index) => ({
          cid: response.data.cid,
          name: `${currentProject.name} version ${
            currentProject.files.length + index + 1
          }`,
        }));

        setCurrentProject((prev) => ({
          ...prev,
          files: [...prev.files, ...newFiles],
        }));

        setProjects((prevProjects) =>
          prevProjects.map((project) =>
            project.name === currentProject.name
              ? { ...project, files: [...project.files, ...newFiles] }
              : project
          )
        );

        setMessage("Files uploaded successfully!");
        toast.success("Files uploaded successfully!");
        setSelectedFiles([]);
      } catch (error) {
        setTransactionSuccess(false);
        setIsTransactionModalVisible(true);
        console.error("Error uploading files:", error);
        setMessage("Error uploading files.");
        toast.error("Failed to upload files.");
      } finally {
        setIsUploading(false);
      }
    } else {
      setMessage("Please select files and choose a project to upload to.");
      toast.error("Please select files and choose a project to upload to.");
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
        a.download = fileName;
        a.click();
      }
    } catch (error) {
      console.error("Error fetching file:", error);
      toast.error("Failed to fetch file.");
    }
  };

  const handleDeleteProject = async (name) => {
    try {
      const contract = await window.tronWeb.contract().at(contractAddress);
      await contract.deleteParticularFolder(name).send({
        feeLimit: 100000000,
        callValue: 0,
      });

      setProjects((prevProjects) =>
        prevProjects.filter((project) => project.name !== name)
      );
      toast.success("Project deleted successfully!");

      if (currentProject && currentProject.name === name) {
        setIsProjectDetailsModalOpen(false);
        setCurrentProject(null);
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project.");
    }
  };

  const handleDeleteFile = async (projectName, fileIndex) => {
    try {
      const contract = await window.tronWeb.contract().at(contractAddress);
      await contract.deleteParticularFile(projectName, fileIndex).send({
        feeLimit: 100000000,
        callValue: 0,
      });

      setProjects((prevProjects) =>
        prevProjects.map((project) => {
          if (project.name === projectName) {
            const updatedFiles = project.files.filter(
              (_, index) => index !== fileIndex
            );
            return { ...project, files: updatedFiles };
          }
          return project;
        })
      );

      if (currentProject && currentProject.name === projectName) {
        setCurrentProject((prev) => ({
          ...prev,
          files: prev.files.filter((_, index) => index !== fileIndex),
        }));
      }

      toast.success("File deleted successfully!");
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file.");
    }
  };

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
    setSelectedFiles(files);
  };

  console.log(currentProject);
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

  // console.log("https://nile.tronscan.org/#/transaction/" + transaction); addddd this wgere ever neccesasary
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
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
          ) : projects.length === 0 ? (
            <div className="no-files">No projects to display</div>
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
                    handleDeleteProject(project.name);
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
                  <span
                    className="delete-text"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFile(currentProject.name, index);
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

      <TransactionModal
        isVisible={isTransactionModalVisible}
        isSuccess={transactionSuccess}
        onClose={() => setIsTransactionModalVisible(false)}
      />
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
