const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const bcrypt = require('bcrypt');
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process"); // Import exec from child_process

const app = express();
const PORT = process.env.PORT || 3000;

const mongoURI = "mongodb://localhost:27017/MyDataBase"; // Replace with your MongoDB URI
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

    

// Create a schema and model for storing predictions
const predictionSchema = new mongoose.Schema({
    imagePath: String,
    predictedLabel: String,
    confidence: Number,
    trueLabel: String,
    createdAt: { type: Date, default: Date.now }
});


const Prediction = mongoose.model("Prediction", predictionSchema);

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model("User", userSchema);
module.exports = User;


const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "frontend")));
app.use(express.static(uploadDir));

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to filename
    }
});
const upload = multer({ storage });

app.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Signup Request:', { email });


        // ✅ Check if the user already exists
        const existingUser = await User.findOne({ email });
        console.log('Existing User Check:', existingUser);

        if (existingUser) {
            console.log('User already exists, blocking signup.');
            return res.status(409).json({ success: false, message: "Email already exists. Please use a different email or log in." });
        }

        // ✅ Validating password with correct regex
        // ✅ Corrected Password Validation Regex
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;

        
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long, include one uppercase letter, one number, and one special character."
            });
        }

        // ✅ Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ Create new user and save
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        
        console.log('User saved:', newUser);
        res.status(201).json({ success: true, message: "Signup successful! Please log in." });
    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).json({ success: false, message: "Internal Server Error. Please try again later." });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login Request:', { email });

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid password" });
        }

        res.status(200).json({ success: true, message: "Login successful!" });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});


// *Forgot Password Route*
app.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        console.log('Forgot Password Request:', { email });

        const normalizedEmail = email.toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });

        // Always return the same message to avoid exposing user existence
        return res.json({ success: true, message: "If this email is registered, you will receive a reset link." });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ success: false, message: "Error processing request" });
    }
});

 // Your user schema

 app.post("/reset-password", async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const normalizedEmail = email.toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const isRecentPassword = await bcrypt.compare(newPassword, user.password);
        if (isRecentPassword) {
            return res.status(400).json({ success: false, error: "recent_password", message: "Don't use recent passwords." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ success: true, message: "Password reset successfully!" });

    } catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// Endpoint to upload an image and get predictions
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: "error", message: "No file uploaded." });
    }

    const imagePath = path.join(uploadDir, req.file.filename); // ✅ Ensure imagePath is defined inside the route

    exec(`python app.py ${imagePath} 2>&1`, (error, stdout, stderr) => {
        console.log("✅ Raw Python output:", stdout);

        // Extract JSON from stdout
        const jsonMatch = stdout.match(/\{.*\}/s); // Find first JSON-like content
        if (!jsonMatch) {
            console.error(`❌ No valid JSON found in output.`);
            return res.status(500).json({ status: "error", message: "Error extracting JSON from prediction result" });
        }

        let predictionResult;
        try {
            predictionResult = JSON.parse(jsonMatch[0]); // Parse only the extracted JSON
        } catch (parseError) {
            console.error(`❌ JSON Parsing Error: ${parseError.message}`);
            return res.status(500).json({ status: "error", message: "Error parsing prediction result" });
        }

        console.log("✅ Prediction Result:", predictionResult);

        // Include accuracy in the response if available
        res.status(200).json({
            status: "success",
            message: "File uploaded and prediction made successfully",
            prediction: predictionResult.prediction,
            confidence: predictionResult.confidence,
            accuracy: predictionResult.accuracy // Include accuracy in the response
        });
    });
});


// ✅ Now the server starts correctly
app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
