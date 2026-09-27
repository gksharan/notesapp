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
  updateDoc,
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

  // Tracks which note (if any) is currently being edited
  const [editingId, setEditingId] = useState(null);

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

  async function uploadImageIfPresent() {
    if (!image) return null;
    const formData = new FormData();
    formData.append("file", image);
    formData.append("upload_preset", "notesapp_unsigned");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/grux5ndc/image/upload",
      { method: "POST", body: formData }
    );
    const data = await res.json();
    return data.secure_url;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setUploading(true);

    const uploadedUrl = await uploadImageIfPresent();

    if (editingId) {
      // --- Update existing note ---
      const updateData = { name, description };
      if (uploadedUrl) updateData.imageUrl = uploadedUrl; // only overwrite if a new image was picked
      await updateDoc(doc(db, "notes", editingId), updateData);
    } else {
      // --- Create new note ---
      await addDoc(collection(db, "notes"), {
        name,
        description,
        imageUrl: uploadedUrl,
        ownerId: user.uid,
      });
    }

    resetForm();
    setUploading(false);
    fetchNotes(user.uid);
  }

  function startEdit(note) {
    setEditingId(note.id);
    setName(note.name);
    setDescription(note.description);
    setImage(null); // leave existing image untouched unless a new one is chosen
  }

  function cancelEdit() {
    resetForm();
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setImage(null);
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

      <form onSubmit={handleSubmit} style={{ marginBottom: 30 }}>
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
          {uploading ? "Saving..." : editingId ? "Update Note" : "Create Note"}
        </button>
        {editingId && (
          <button type="button" onClick={cancelEdit} style={{ marginLeft: 10 }}>
            Cancel
          </button>
        )}
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
          <div style={{ marginTop: 10 }}>
            <button onClick={() => startEdit(note)} style={{ marginRight: 10 }}>
              Edit
            </button>
            <button onClick={() => deleteNote(note.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}