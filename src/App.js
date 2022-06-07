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
  const [time, setTime] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [counter, setCounter] = useState(0);
  const [originalText, setOriginalText] = useState("");
  const [encryptedText, setEncryptedText] = useState("");

  useEffect(() => {
    // initialize timer with worldtimeapi
    getServerTime()
      .then((serverTime) => {
        if (serverTime == null)
          throw new Error("Cannot fetch time from worldtimeapi");
        
        // set time as server time
        setTime(serverTime);

        // initialize QR code
        const encryptedTextStr = encrypt.encrypt(`${DEFAULT_USER_ID},${serverTime.toISOString().substring(0, serverTime.toISOString().length - 5)}Z`);
        setOriginalText(`${DEFAULT_USER_ID},${serverTime.toISOString().substring(0, serverTime.toISOString().length - 5)}Z`);
        setEncryptedText(encryptedTextStr);
      }).catch(err => {
        alert(err);
      });
    
    setStartTime(new Date());
    setInterval(() => {
      const diff = Date.now() - startTime;
      const diffInSeconds = Math.floor(diff / 1000);
      setCounter(diffInSeconds);
    }, 100);
  }, []);

  const refreshQrCode = useCallback(() => {
    const encryptedTextStr = encrypt.encrypt(`${userId},${time.toISOString().substring(0, time.toISOString().length - 5)}Z`);

    if (encryptedTextStr === false) {
      alert('Invalid Public Key');
      return;
    }
    setOriginalText(`${userId},${time.toISOString().substring(0, time.toISOString().length - 5)}Z`);
    setEncryptedText(encryptedTextStr);
  },[userId, time]);

  useEffect(() => {
    setTime((prevTime) => {
      return new Date(prevTime.getTime() + 1000);
    });

    if (counter % INTERVAL === 0) { // if it's an interval cycle
      refreshQrCode();
    }
  }, [counter]);

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
            { 
              time != null &&
              (
                <div>{`${time.toISOString().substring(0, time.toISOString().length - 5)}Z`}</div> 
              )
            }

            <div>
              <Button variant="primary" id="refresh-btn" onClick={refreshQrCode}>Refresh</Button>
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

                  <div className="label">QR Code (Auto refresh after {INTERVAL - counter % INTERVAL} seconds)</div>
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
