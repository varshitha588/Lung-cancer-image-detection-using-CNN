document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ DOM fully loaded");
    checkLoginStatus();

    const uploadForm = document.getElementById("upload-form");
    const fileInput = document.getElementById("imageUpload");
    const uploadStatus = document.getElementById("upload-message");
    const uploadedImage = document.getElementById("uploaded-image");
    const predictionResult = document.getElementById("prediction-result");
    const accuracyResult = document.getElementById("accuracy-result"); // Element for accuracy

    if (uploadForm) {
        uploadForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            resetResults(); // Reset results at the start of the upload process

            if (!fileInput.files.length) {
                uploadStatus.textContent = "⚠️ Please select an image file.";
                return;
            }
            
            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append("image", file);

            try {
                uploadStatus.textContent = "⏳ Uploading...";

                const response = await fetch("http://localhost:3000/upload", {
                    method: "POST",
                    body: formData,
                });

                const result = await response.json();
                console.log("🔹 Server Response:", result); // Log the entire response

                // Clear any previous error messages
                uploadStatus.textContent = "";

                // Check if the response is OK and has the expected structure
                if (!response.ok || result.status !== "success") {
                    uploadStatus.textContent = ` Upload failed: ${result.message || "Unknown error"}`;
                    return;
                }

                // Successful upload
                uploadStatus.textContent = "Upload successful!";
                uploadedImage.src = URL.createObjectURL(file);
                uploadedImage.style.display = "block";

                // Display prediction result
                if (result.prediction) {
                    predictionResult.innerHTML = 
                        `Prediction: <strong>${result.prediction}</strong> `;
                } else {
                    predictionResult.innerHTML = " Invalid Image.";
                }
            } catch (error) {
                console.error('Error uploading image:', error);
                uploadStatus.textContent = '⚠️ An error occurred while processing the image. Please try again.';
            }
        });
    }

    function resetResults() {
        console.log("Resetting results...");
        predictionResult.innerHTML = "";
        accuracyResult.innerHTML = ""; // Reset accuracy result
        uploadedImage.style.display = "none"; // Hide the uploaded image
    }
});
document.addEventListener("DOMContentLoaded", function () {
    checkLoginStatus();
});

// ✅ Function to Check Login Status
function checkLoginStatus() {
    const token = localStorage.getItem("authToken"); // 🔹 Fix: Use correct key

    if (token) {
        document.getElementById("login-btn").style.display = "none";
        document.getElementById("signup-btn").style.display = "none";
        document.getElementById("logout-btn").style.display = "block";
        document.getElementById("form-section").style.display = "none"; // Hide login/signup forms
        document.getElementById("upload-section").style.display = "block"; // Show upload section
    } else {
        document.getElementById("login-btn").style.display = "block";
        document.getElementById("signup-btn").style.display = "block";
        document.getElementById("logout-btn").style.display = "none";
        document.getElementById("form-section").style.display = "block"; // Show login/signup forms
        document.getElementById("upload-section").style.display = "none"; // Hide upload section
    }
}

// ✅ Login Function
function login(event) {
    event.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    fetch("http://localhost:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("Login successful!");
            localStorage.setItem("authToken", data.token); // 🔹 Store token
            checkLoginStatus(); // ✅ Update UI after login
        } else {
            alert("Invalid credentials. Please try again.");
        }
    })
    .catch(error => {
        console.error("Error during login:", error);
        alert("Error during login.");
    });
}

// ✅ Logout Function
function logout() {
    localStorage.removeItem("authToken"); // 🔹 Fix: Remove correct key
    alert("Logged out successfully!");
    checkLoginStatus();
}

// ✅ Signup Function
function signup(event) {
    event.preventDefault();
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;
    const messageBox = document.getElementById("signup-message");

    // Password Validation: 6+ characters, 1 uppercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    
    if (!passwordRegex.test(password)) {
        messageBox.innerText = "Password must be at least 6 characters long, include one uppercase letter, one number, and one special character.";
        messageBox.style.color = "red";
        return;
    }
    
    fetch("http://localhost:3000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    })
    .then(response => response.json().then(data => ({ status: response.status, body: data })))
    .then(({ status, body }) => {
        if (status === 201) {
            messageBox.innerText = "Signup successful! Please log in.";
            messageBox.style.color = "green";
            showLoginForm();
        } else if (status === 409) {
            messageBox.innerText = "Email already exists. Please log in or use a different email.";
            messageBox.style.color = "red";
        } else {
            messageBox.innerText = body.message;
            messageBox.style.color = "red";
        }
    })
    .catch(error => {
        console.error("Error during signup:", error);
        messageBox.innerText = "Error during signup.";
        messageBox.style.color = "red";
    });
}

// ✅ Upload Image Function
function uploadImage(event) {
    if (!localStorage.getItem("authToken")) { // 🔹 Fix: Use correct key
        alert("Please login to upload an image.");
        showLoginForm();
        return;
    }

    const fileInput = event.target;
    const formData = new FormData();
    formData.append("image", fileInput.files[0]);

    fetch("http://localhost:5000/upload-image", {
        method: "POST",
        body: formData
    })
    .then((response) => response.json())
    .then((data) => {
        alert(data.message); // ✅ Notify user that processing is complete
    })
    .catch((error) => {
        console.error("Error uploading image:", error);
        alert("Error uploading image.");
    });
}

// ✅ Show Forms Functions
function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('forgot-password-form').style.display = 'none';
    document.getElementById('reset-password-form').style.display = 'none';
}

function showSignupForm() {
    document.getElementById('signup-form').style.display = 'block';
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('forgot-password-form').style.display = 'none';
    document.getElementById('reset-password-form').style.display = 'none';
}

function showForgotPasswordForm() {
    document.getElementById('forgot-password-form').style.display = 'block';
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('reset-password-form').style.display = 'none';
}

function showResetPasswordForm() {
    document.getElementById('reset-password-form').style.display = 'block';
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('forgot-password-form').style.display = 'none';
}
