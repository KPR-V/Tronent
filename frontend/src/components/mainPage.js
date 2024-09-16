import React from 'react'
import Axios from 'axios'

async function upload() {
    try {
      const response = await Axios.get("http://localhost:5001/upload");
      if (response) {
        console.log(response.data);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  }
const MainPage = () => {
  return (
    <div>
         <button onClick={upload}>yoo</button>
    </div>

  )
}

export default MainPage