import { KeyRound } from "lucide-react";
import { useState } from "react";

export default function LoginScreen({ onSubmit }) {
  const [key, setKey] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    if (key.trim()) {
      onSubmit(key.trim());
    }
  }

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-icon">
          <KeyRound size={28} />
        </div>
        <h1>Clean Reader</h1>
        <p>Unlock your library with your private key.</p>
        <form onSubmit={handleSubmit} className="login-form">
          <input
            className="input"
            type="password"
            placeholder="Access key"
            value={key}
            onChange={(event) => setKey(event.target.value)}
          />
          <button className="btn primary" type="submit">
            Enter Library
          </button>
        </form>
      </div>
    </div>
  );
}
