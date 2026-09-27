import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
} from "firebase/firestore";

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [notes, setNotes] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Watch login state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) fetchNotes(currentUser.uid);
    });
    return unsubscribe;
  }, []);

  async function fetchNotes(uid) {
    const q = query(collection(db, "notes"), where("ownerId", "==", uid));
    const snapshot = await getDocs(q);
    setNotes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  async function handleSignUp(e) {
    e.preventDefault();
    setAuthError("");
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setAuthError(err.message);
    }
  }

  async function handleSignIn(e) {
    e.preventDefault();
    setAuthError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setAuthError(err.message);
    }
  }

  async function createNote(e) {
    e.preventDefault();
    setUploading(true);

    let imageUrl = null;

    if (image) {
      const formData = new FormData();
      formData.append("file", image);
      formData.append("upload_preset", "notesapp_unsigned");

      const res = await fetch(
        "https://api.cloudinary.com/v1_1/grux5ndc/image/upload",
        { method: "POST", body: formData }
      );
      const data = await res.json();
      imageUrl = data.secure_url;
    }

    await addDoc(collection(db, "notes"), {
      name,
      description,
      imageUrl,
      ownerId: user.uid,
    });

    setName("");
    setDescription("");
    setImage(null);
    setUploading(false);
    fetchNotes(user.uid);
  }

  async function deleteNote(id) {
    await deleteDoc(doc(db, "notes", id));
    fetchNotes(user.uid);
  }

  // --- Not logged in: show sign in / sign up form ---
  if (!user) {
    return (
      <div style={{ maxWidth: 400, margin: "4rem auto", fontFamily: "sans-serif" }}>
        <h1>My Notes App</h1>
        <form>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: "block", width: "100%", marginBottom: 10, padding: 8 }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: "block", width: "100%", marginBottom: 10, padding: 8 }}
          />
          {authError && <p style={{ color: "red" }}>{authError}</p>}
          <button onClick={handleSignIn} style={{ marginRight: 10 }}>
            Sign In
          </button>
          <button onClick={handleSignUp}>Create Account</button>
        </form>
      </div>
    );
  }

  // --- Logged in: show notes app ---
  return (
    <div style={{ maxWidth: 700, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>My Notes App</h1>
      <button onClick={() => signOut(auth)} style={{ marginBottom: 20 }}>
        Sign Out
      </button>

      <form onSubmit={createNote} style={{ marginBottom: 30 }}>
        <input
          placeholder="Note Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ display: "block", width: "100%", marginBottom: 10, padding: 8 }}
        />
        <input
          placeholder="Note Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          style={{ display: "block", width: "100%", marginBottom: 10, padding: 8 }}
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files[0])}
          style={{ display: "block", marginBottom: 10 }}
        />
        <button type="submit" disabled={uploading}>
          {uploading ? "Creating..." : "Create Note"}
        </button>
      </form>

      <h2>Current Notes</h2>
      {notes.map((note) => (
        <div
          key={note.id}
          style={{ border: "1px solid #ccc", padding: 15, marginBottom: 10, borderRadius: 8 }}
        >
          <h3>{note.name}</h3>
          <p>{note.description}</p>
          {note.imageUrl && (
            <img
              src={note.imageUrl}
              alt={note.name}
              style={{ width: "100%", maxWidth: 300, marginTop: 10 }}
            />
          )}
          <button onClick={() => deleteNote(note.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}