import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import qrCodeKey from './key.json';
import { Button } from 'react-bootstrap';
import JSEncrypt from 'jsencrypt'
import QRCode from "react-qr-code";
import axios from 'axios';

import 'bootstrap/dist/css/bootstrap.min.css';

const getServerTime = async () => {
  // get current time from server as base time
  const res = await axios.get('https://worldtimeapi.org/api/timezone/Etc/UTC');
  if (res.data.datetime == null || typeof res.data.datetime !== 'string') 
    throw new Error("Cannot fetch time from worldtimeapi");

  return new Date(res.data.datetime);
}

const encrypt = new JSEncrypt();
encrypt.setPublicKey(qrCodeKey.public);

function App() {
  const INTERVAL = 5;
  const DEFAULT_USER_ID = "123456";

  const [userId, setUserId] = useState(DEFAULT_USER_ID);
  const [time, setTime] = useState("");
  const [counter, setCounter] = useState(INTERVAL);
  const [originalText, setOriginalText] = useState("");
  const [encryptedText, setEncryptedText] = useState("");

  useEffect(() => {
    getServerTime()
      .then((serverTime) => {
        if (serverTime == null)
          throw new Error("Cannot fetch time from worldtimeapi");
        
        // set time as server time
        setTime(serverTime.toISOString());

        // initialize QR code
        const encryptedTextStr = encrypt.encrypt(`${DEFAULT_USER_ID},${serverTime.toISOString().substring(0, serverTime.toISOString().length - 5)}Z`);
        setOriginalText(`${DEFAULT_USER_ID},${serverTime.toISOString().substring(0, serverTime.toISOString().length - 5)}Z`);
        setEncryptedText(encryptedTextStr);
      }).catch(err => {
        alert(err);
      });
    
    setInterval(() => {
      // Set Time
      setTime((prevTime) => {
        const currentTime = new Date(prevTime);
        currentTime.setSeconds(currentTime.getSeconds() + 1);
        return currentTime.toISOString();
      });

      // Set counter
      setCounter(prevCounter => {
        if (prevCounter > 0)
          return prevCounter - 1
        else
          return INTERVAL;
      });
    }, 1000);
  }, []);

  const refreshQrCode = useCallback(() => {
    const encryptedTextStr = encrypt.encrypt(`${userId},${time.substring(0, time.length - 5)}Z`);

    if (encryptedTextStr === false) {
      alert('Invalid Public Key');
      return;
    }
    setOriginalText(`${userId},${time.substring(0, time.length - 5)}Z`);
    setEncryptedText(encryptedTextStr);
  },[userId, time]);

  useEffect(() => {
    // if interval has passed
    if (counter === 0) {
      // sync time with worldtimeapi
      getServerTime()
        .then((serverTime) => {
          if (serverTime == null)
            throw new Error("Cannot fetch time from worldtimeapi")
          setTime(serverTime.toISOString());
          refreshQrCode();  // and refresh QR code again
        }).catch(err => {
          alert(err);
        });
    }
  },[counter]);

  const generateQrCode = useCallback(() => {
    refreshQrCode();
    setCounter(INTERVAL);
  },[]);

  const userIdOnChange = useCallback((event) => {
    setUserId(event.target.value);
  },[]);

  return (
    <div className="App">
      <div className="container" id="input-area">
        <div className="row">
          <div className="col-6">
            <div className="label">Public Key</div>
            <textarea value={qrCodeKey.public} readOnly/>
      
            <div className="label">User ID</div>
            <input type="text" value={userId} onChange={userIdOnChange}/>

            <div className="label">Current UTC Time (sync with worldtimeapi.org)</div>
            <div>{`${time.substring(0, time.length - 5)}Z`}</div> 

            <div>
              <Button variant="primary" id="refresh-btn" onClick={generateQrCode}>Generate</Button>
            </div>
          </div>  
          
          <div className="col-6">
            <div className="label">Encoded Text</div>
            <textarea readOnly value={encryptedText}/>

            {
              time != null &&
              userId != null &&
              (
                <>
                  <div className="label">Original Text</div>
                  <div>{originalText}</div> 

                  <div className="label">QR Code (Auto refresh after {counter} seconds)</div>
                  <div id="qr-code-wrapper">
                    <QRCode value={encryptedText} />
                  </div>
                </> 
              )
            }
          </div>  
        </div>
      </div>
    </div>
  );
}

export default App;
