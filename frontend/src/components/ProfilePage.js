import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate,  } from 'react-router-dom';
import './ProfilePage.css'; 

const ProfilePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState([
    { id: 1, name: "Project Alpha" },
    { id: 2, name: "Project Beta" },
    { id: 3, name: "Gamma Files" },
    { id: 4, name: "Project game" },
    { id: 5, name: "Project chips" },
    { id: 6, name: "Gamma rays" }
    // More projects...
  ]);

  const navigate = useNavigate();


  // State for handling the popup modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [message, setMessage] = useState('');

  // Function to open/close modal
  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const searchProjects = (projects) => {
    return projects.filter((project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const handleFileChange = (event) => {
    setSelectedFiles(event.target.files);
  };

  const handleFileUpload = async () => {
    if (selectedFiles.length > 0) {
      const formData = new FormData();
      Array.from(selectedFiles).forEach(file => formData.append('file', file));
      
      try {
        const response = await axios.post('http://localhost:4040/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setMessage('Files uploaded successfully!');
        console.log(response.data);  // Check the response for CID, etc.
      } catch (error) {
        setMessage('Error uploading files.');
        console.error('File upload error:', error);
      }
    } else {
      setMessage('No files selected.');
    }
  };
  

  return (
    <div className='profile-page'>
      <div className='navigation-bar'>
        <div className="navigation-bar-content">
          <div className='icon'></div>
          <div className='button-group2'>
            <button className='home-page-btn' onClick={() => navigate('/')}>
              Home Page
            </button>
            <button className='upload-route-btn' onClick={toggleModal}>
              Upload New File
            </button>
          </div>
        </div>
      </div>

      <div className="explorer">
        <div className="explorer-navigation">
          <div className="title archivo-black-regular">Your Projects</div>
          <div className='search-bar'>
            <input
              type="text"
              placeholder="Search Projects"
              className="search-input"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="files-display">
          {searchProjects(projects).map((project) => (
            <div key={project.id} className="project-card">
              <div className="project-name">{project.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal for Upload */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content1">
            <h2>Upload your new Files here!</h2>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="file-input"
            />
            <button onClick={handleFileUpload} className="upload-btn">
              Upload
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
            <button onClick={toggleModal} className="close-btn1">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
