import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './ProfilePage.css';

const ProfilePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState([]); // Initially no files
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false); // To show loading spinner
  const [dragging, setDragging] = useState(false); // For drag-and-drop

  const navigate = useNavigate();

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
    setSelectedFiles([]);
    setMessage('');
  };

  const searchProjects = (projects) => {
    return projects.filter((project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
  };

  const handleFileUpload = async () => {
    if (selectedFiles.length > 0) {
      setIsUploading(true); // Start loading spinner
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('file', file));

      try {
        const response = await axios.post('http://localhost:4040/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        console.log('Response data:', response.data); // Log the response data

        const newProjects = Array.isArray(response.data)
          ? response.data.map((file) => ({
              id: file.cid,
              name: file.originalFilename,
              cid: file.cid,
              version: file.version,
            }))
          : [{
              id: response.data.cid,
              name: response.data.originalFilename,
              cid: response.data.cid,
              version: response.data.version,
            }];

        setProjects((prevProjects) => [...prevProjects, ...newProjects]);
        setMessage('Files uploaded successfully!');
      } catch (error) {
        setMessage('Error uploading files.');
        console.error('File upload error:', error);
      } finally {
        setIsUploading(false); // Stop loading spinner
      }
    } else {
      setMessage('No files selected.');
    }
  };

  const handleProjectClick = async (cid) => {
    try {
      const response = await axios({
        url: `http://localhost:4040/getfile?cid=${cid}`,
        method: 'GET',
        responseType: 'arraybuffer', // Change to arraybuffer for proper handling
      });

      const fileType = response.headers['content-type']; // Get file type from headers
      const blob = new Blob([response.data], { type: fileType }); // Create blob with correct type
      const fileURL = window.URL.createObjectURL(blob); // Create URL for the blob

      // Open the file in a new tab based on its type
      if (fileType.startsWith('image/')) {
        window.open(fileURL, '_blank');
      } else if (fileType === 'application/pdf') {
        window.open(fileURL, '_blank');
      } else if (fileType.startsWith('text/')) {
        const textResponse = await response.data.text(); // Convert blob to text for display
        alert(textResponse); // Display text in an alert for demo, you can customize this
      } else {
        // For other file types, prompt user to download the file
        const a = document.createElement('a');
        a.href = fileURL;
        a.download = `${cid}`; // Provide a default name for download
        a.click();
      }
    } catch (error) {
      console.error('Error fetching file:', error);
    }
  };

  // Drag-and-drop functionality
  const handleDragOver = (event) => {
    event.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    setSelectedFiles((prevFiles) => [...prevFiles, ...Array.from(files)]);
    setDragging(false);
  };

  return (
    <div className="profile-page">
      <div className="navigation-bar">
        <div className="navigation-bar-content">
          <div className="icon"></div>
          <div className="button-group2">
            <button className="home-page-btn" onClick={() => navigate('/')}>
              Home Page
            </button>
            <button className="upload-route-btn" onClick={toggleModal}>
              Upload New File
            </button>
          </div>
        </div>
      </div>

      <div className="explorer">
        <div className="explorer-navigation">
          <div className="title archivo-black-regular">Your Projects</div>
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
                onClick={() => handleProjectClick(project.cid)} // Pass the cid here
              >
                <div className="project-name">{project.name}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal for Upload */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div
            className={`modal-content1 ${dragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <h2>Upload your new Files here!</h2>

            {/* Button to choose files from PC */}
            <button onClick={() => document.getElementById('fileInput').click()} className="choose-files-btn">
              Choose Files from PC
            </button>
            <input
              type="file"
              id="fileInput"
              multiple
              onChange={handleFileChange}
              style={{ display: 'none' }} // Hide default input, will be triggered by button
            />

            <div className={`drag-drop-area ${dragging ? 'dragging' : ''}`}>
              Drag & Drop files here
            </div>

            <button onClick={handleFileUpload} className="upload-btn">
              Upload
              {isUploading && <span className="loading-spinner"></span>}
              {!isUploading && message === 'Files uploaded successfully!' && (
                <span className="tick-mark">✔</span>
              )}
            </button>

            {selectedFiles.length > 0 && (
              <div className="file-list">
                <h3>Selected Files:</h3>
                <ul>
                  {Array.from(selectedFiles).map((file, index) => (
                    <li key={index}>{file.name}</li>
                  ))}
                </ul>
              </div>
            )}
            {message && <p>{message}</p>}
            <button onClick={toggleModal} className="close-btn1">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
