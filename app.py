import warnings
from flask import Flask, render_template, request, jsonify, send_from_directory
import torch
import torch.nn as nn
import torchvision.models as models
from torchvision import transforms
from PIL import Image
import os
import io
from datetime import datetime

# Suppress specific warnings
warnings.filterwarnings("ignore", category=UserWarning, module="torchvision.models._utils")

app = Flask(__name__)

# Configuration
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB limit
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Define the class names
CLASS_NAMES = ['good', 'poor', 'satisfactory', 'very_poor']

# Define confidence threshold
CONFIDENCE_THRESHOLD = 0.7  # 70% confidence threshold

# Define messages for each class
CLASS_MESSAGES = {
    'good': "The road is in excellent condition with minimal surface distress. No immediate maintenance required.",
    'poor': "The road shows significant distress with multiple potholes and cracking. Repairs are recommended within 6 months.",
    'satisfactory': "The road has minor surface distress with some cracking. Maintenance recommended within 1-2 years.",
    'very_poor': "The road is severely damaged with extensive potholes and cracking. Immediate repair work is necessary for safe use."
}

# Define low confidence message
LOW_CONFIDENCE_MESSAGE = "The prediction confidence is below our threshold for reliable assessment. Please try again with a clearer image taken from a better angle with good lighting conditions."

# Set up image transformations
transform = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.ToTensor(),
])

def load_model():
    """Load the trained ResNet18 model."""
    model = models.resnet18(pretrained=False)
    num_ftrs = model.fc.in_features
    model.fc = nn.Linear(num_ftrs, 4)  # 4 classes
    model.load_state_dict(torch.load('road_damage_resnet18_state_dict.pth',
                                   map_location=torch.device('cpu')))
    model.eval()
    return model

# Load the model at startup
model = load_model()

@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')

@app.route('/about')
def about():
    """Render the about page."""
    return render_template('about.html')

@app.route('/contact')
def contact():
    """Render the contact page."""
    return render_template('contact.html')

@app.route('/predict', methods=['POST'])
def predict():
    """Process the uploaded image and return prediction."""
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No image selected'}), 400

    try:
        # Validate file type
        if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            return jsonify({'error': 'Invalid file type. Please upload a PNG, JPG, or JPEG image.'}), 400

        # Save the uploaded file temporarily
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"upload_{timestamp}.jpg"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # Read and transform the image
        img = Image.open(filepath).convert('RGB')
        img_tensor = transform(img).unsqueeze(0)  # Add batch dimension

        # Make prediction
        with torch.no_grad():
            outputs = model(img_tensor)
            probabilities = torch.nn.functional.softmax(outputs, dim=1)
            confidence, predicted = torch.max(probabilities, 1)
            confidence_value = float(confidence.item())
            class_idx = predicted.item()
            class_name = CLASS_NAMES[class_idx]

            # Check if confidence is below threshold
            if confidence_value < CONFIDENCE_THRESHOLD:
                message = LOW_CONFIDENCE_MESSAGE
                low_confidence = True
            else:
                message = CLASS_MESSAGES[class_name]
                low_confidence = False

        return jsonify({
            'class': class_name,
            'message': message,
            'confidence': confidence_value,
            'lowConfidence': low_confidence,
            'imagePath': f"/static/uploads/{filename}"
        })

    except Exception as e:
        return jsonify({'error': f"An error occurred: {str(e)}"}), 500

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    app.run(debug=True)