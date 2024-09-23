import React from 'react'

const UploadPage = () => {
  return (
    <div>
    <div>UploadPage</div>
    <button onClick={checkBalance}>What is the balance?</button>
      {message && <p>{message}</p>}
    </div>
  )
}

export default UploadPage