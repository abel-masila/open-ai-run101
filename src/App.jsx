import "regenerator-runtime/runtime";
import { useEffect, useRef, useState } from "react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

import { socket } from "./socket";
import "./App.css";
import axios from "axios";

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [logs, setLogs] = useState([]);
  const { transcript, resetTranscript } = useSpeechRecognition();
  const [response, setResponse] = useState("");
  const [audioSrc, setAudioSrc] = useState(null);
  const audioRef = useRef(null);

  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      console.log("Connected to server.");

      socket.emit("join", { person_id: 6740 });
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onLogLoad(data) {
      setLogs((previous) => [...previous, data.data.message]);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("log_message", onLogLoad);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("log_message", onLogLoad);
    };
  }, []);

  console.log({
    isConnected,
    logs,
  });

  const handleSpeechRecognition = async () => {
    try {
      SpeechRecognition.startListening({ continuous: true });

      const result = await axios.post(
        "https://api.openai.com/v1/speech-to-text",
        transcript,
        {
          headers: {
            "Content-Type": "audio/wav",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            withCredentials: false,
            "Access-Control-Allow-Credentials": false,
          },
        }
      );

      // Handle the response from OpenAI API
      setResponse(result.data.text);
      resetTranscript();
    } catch (error) {
      console.error("Error:", error);
      resetTranscript();
    }
  };
  const handleTextToSpeech = async () => {
    try {
      const result = await axios.post(
        "https://api.openai.com/v1/speech-to-text",
        {
          text: response,
          voice: "en-US-Standard-C",
          format: "wav",
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            withCredentials: false,
            "Access-Control-Allow-Credentials": false,
          },
          responseType: "arraybuffer",
        }
      );

      const audioBlob = new Blob([result.data], { type: "audio/wav" });
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioSrc(audioUrl);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleResetResponse = () => {
    setResponse("");
    setAudioSrc(null);
  };
  return (
    <>
      <h4>Test socket.io</h4>
      <p>{logs}</p>
      <hr />

      <button onClick={handleSpeechRecognition}>
        Start Speech Recognition
      </button>
      <button onClick={handleTextToSpeech} disabled={!response}>
        Convert Text to Speech
      </button>
      <button onClick={handleResetResponse}>Reset</button>
      <p>{transcript}</p>
      <p>Response: {response}</p>
      {audioSrc && <audio ref={audioRef} src={audioSrc} controls autoPlay />}
    </>
  );
}

export default App;
