import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // For navigation between routes
import './ProfilePage.css';

const ProfilePage = () => {
  const [projects, setProjects] = useState([
    { id: 1, name: "Project Alpha" },
    { id: 2, name: "Project Beta" },
    { id: 3, name: "Gamma Files" },
    { id: 4, name: "Project Delta" },
    { id: 5, name: "Project Epsilon" },
    { id: 6, name: "Project Zeta" },
    { id: 7, name: "Project Eta" },
    { id: 8, name: "Project Sphere" },
    { id: 9, name: "Project Dimension" },
    { id: 10, name: "Mysterious Eta" }
  ]);

  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useNavigate(); // Initialize navigate for navigation

  // Function to filter projects based on search query
  const searchProjects = (projects) => {
    return projects.filter((project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return (
    <div className='profile-page'>
      <div className='navigation-bar'>
        <div className="navigation-bar-content">
          <div className='icon'></div>
          <div className='button-group2'>
            {/* Navigation to the Main Page */}
            <button 
              className='home-page-btn' 
              onClick={() => navigate('/')}
            >
              Home Page
            </button>

            {/* Navigation to the Upload Page */}
            <button 
              className='upload-route-btn' 
              onClick={() => navigate('/upload')}
            >
              Upload New File
            </button>
          </div>
        </div>
      </div>

      <div className="explorer">
        <div className="explorer-navigation">
          <div className="title archivo-black-regular">
            Your Projects
          </div>
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
    </div>
  );
};

export default ProfilePage;
