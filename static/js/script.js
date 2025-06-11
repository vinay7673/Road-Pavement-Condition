document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const uploadBtn = document.getElementById('uploadBtn');
    const captureBtn = document.getElementById('captureBtn');
    const imageInput = document.getElementById('imageInput');
    const cameraInput = document.getElementById('cameraInput');
    const previewImage = document.getElementById('previewImage');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const resultSection = document.getElementById('resultSection');
    const resultCard = document.getElementById('resultCard');
    const resultImage = document.getElementById('resultImage');
    const resultClass = document.getElementById('resultClass');
    const resultMessage = document.getElementById('resultMessage');
    const resultConfidence = document.getElementById('resultConfidence');
    const confidenceBar = document.getElementById('confidenceBar');
    const confidenceBadge = document.getElementById('confidenceBadge');
    const confidenceWarning = document.getElementById('confidenceWarning');
    const warningText = document.getElementById('warningText');
    const recommendationList = document.getElementById('recommendationList');
    const newAnalysisBtn = document.getElementById('newAnalysisBtn');
    const analyzeText = document.getElementById('analyzeText');
    const analyzeSpinner = document.getElementById('analyzeSpinner');

    // Recommendation templates
    const RECOMMENDATIONS = {
        good: [
            "Routine inspections every 6 months",
            "Continue regular cleaning and drainage maintenance"
        ],
        satisfactory: [
            "Apply surface treatment within 1-2 years",
            "Monitor for crack progression",
            "Consider seal coating"
        ],
        poor: [
            "Plan for resurfacing within 6 months",
            "Temporary pothole repairs immediately",
            "Evaluate subsurface drainage"
        ],
        very_poor: [
            "Immediate temporary repairs for safety",
            "Full reconstruction recommended",
            "Prioritize for capital improvement program"
        ]
    };

    // Event Listeners
    uploadBtn.addEventListener('click', () => imageInput.click());
    captureBtn.addEventListener('click', () => cameraInput.click());

    imageInput.addEventListener('change', handleFileSelect);
    cameraInput.addEventListener('change', handleFileSelect);

    analyzeBtn.addEventListener('click', analyzeImage);
    newAnalysisBtn.addEventListener('click', resetAnalyzer);

    // Functions
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.match('image.*')) {
            showAlert('Please select an image file (JPEG, PNG)', 'danger');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showAlert('Image size should be less than 5MB', 'danger');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            previewImage.src = event.target.result;
            analyzeBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    function analyzeImage() {
        const file = imageInput.files[0] || cameraInput.files[0];
        if (!file) {
            showAlert('Please select an image first', 'danger');
            return;
        }

        // Show loading state
        analyzeBtn.disabled = true;
        analyzeText.textContent = 'Analyzing...';
        analyzeSpinner.classList.remove('d-none');

        const formData = new FormData();
        formData.append('image', file);

        fetch('/predict', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }

            // Display results
            displayResults(data);
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert(`Analysis failed: ${error.message}`, 'danger');
        })
        .finally(() => {
            // Reset button state
            analyzeBtn.disabled = false;
            analyzeText.textContent = 'Analyze Road Condition';
            analyzeSpinner.classList.add('d-none');
        });
    }

    function displayResults(data) {
        // Update result card
        resultImage.src = data.imagePath || previewImage.src;
        resultClass.textContent = data.class.replace('_', ' ');
        resultMessage.textContent = data.message;

        // Format confidence percentage
        const confidencePercent = Math.round(data.confidence * 100);
        resultConfidence.textContent = confidencePercent;
        confidenceBar.style.width = `${confidencePercent}%`;
        confidenceBar.setAttribute('aria-valuenow', confidencePercent);

        // Set appropriate styling based on class
        resultCard.className = 'card border-0 shadow-sm mb-3';
        resultCard.classList.add(data.class);

        // Update confidence badge
        confidenceBadge.textContent = `${confidencePercent}% Confidence`;
        confidenceBadge.className = 'badge rounded-pill ';

        if (data.lowConfidence) {
            confidenceBadge.classList.add('bg-warning', 'text-dark');
            confidenceWarning.classList.remove('d-none');
            warningText.textContent = 'Low confidence prediction. Consider retaking the image with better lighting and angle.';
        } else {
            if (confidencePercent >= 90) {
                confidenceBadge.classList.add('bg-success');
            } else if (confidencePercent >= 70) {
                confidenceBadge.classList.add('bg-primary');
            } else {
                confidenceBadge.classList.add('bg-secondary');
            }
            confidenceWarning.classList.add('d-none');
        }

        // Update progress bar color
        confidenceBar.className = 'progress-bar ';
        if (confidencePercent >= 90) {
            confidenceBar.classList.add('bg-success');
        } else if (confidencePercent >= 70) {
            confidenceBar.classList.add('bg-primary');
        } else {
            confidenceBar.classList.add('bg-warning');
        }

        // Add recommendations
        recommendationList.innerHTML = '';
        const recommendations = RECOMMENDATIONS[data.class] || [];
        recommendations.forEach(rec => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.innerHTML = `<i class="bi bi-check-circle-fill text-success me-2"></i>${rec}`;
            recommendationList.appendChild(li);
        });

        // Show results section
        resultSection.classList.remove('d-none');

        // Scroll to results
        resultSection.scrollIntoView({ behavior: 'smooth' });
    }

    function resetAnalyzer() {
        // Reset form
        imageInput.value = '';
        cameraInput.value = '';
        previewImage.src = '/static/images/sample-road.jpg';
        analyzeBtn.disabled = true;

        // Hide results
        resultSection.classList.add('d-none');

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        const container = document.querySelector('.card-body');
        container.insertBefore(alertDiv, container.firstChild);

        setTimeout(() => {
            alertDiv.classList.remove('show');
            setTimeout(() => alertDiv.remove(), 150);
        }, 5000);
    }
});