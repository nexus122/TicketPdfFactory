// ===========================
// PDF Ticket Generator
// ===========================

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Get DOM elements
    const startNumberInput = document.getElementById('start-number');
    const endNumberInput = document.getElementById('end-number');
    const perPageInput = document.getElementById('per-page');
    const columnsInput = document.getElementById('columns');
    const ticketTextInput = document.getElementById('ticket-text');
    const generateBtn = document.getElementById('generate-btn');
    const totalTicketsSpan = document.getElementById('total-tickets');
    const totalPagesSpan = document.getElementById('total-pages');
    const progressContainer = document.getElementById('progress-container');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const backgroundImageInput = document.getElementById('background-image');
    const fileNameSpan = document.getElementById('file-name');
    const clearImageBtn = document.getElementById('clear-image');
    const opacityControl = document.getElementById('opacity-control');
    const opacitySlider = document.getElementById('image-opacity');
    const opacityValue = document.getElementById('opacity-value');

    // Store background image data and opacity
    let backgroundImageData = null;
    let imageOpacity = 0.3; // Default 30%

    // Update stats when inputs change
    const updateStats = () => {
        const start = parseInt(startNumberInput.value) || 1;
        const end = parseInt(endNumberInput.value) || 300;
        const perPage = parseInt(perPageInput.value) || 50;

        const total = Math.max(0, end - start + 1);
        const pages = Math.ceil(total / perPage);

        totalTicketsSpan.textContent = total;
        totalPagesSpan.textContent = pages;
    };

    // Add event listeners for real-time updates
    startNumberInput.addEventListener('input', updateStats);
    endNumberInput.addEventListener('input', updateStats);
    perPageInput.addEventListener('input', updateStats);

    // Handle background image upload
    backgroundImageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                backgroundImageData = await readImageFile(file);
                fileNameSpan.textContent = file.name;
                clearImageBtn.classList.remove('hidden');
                opacityControl.classList.remove('hidden');
            } catch (error) {
                console.error('Error loading image:', error);
                alert('Error al cargar la imagen. Por favor, intenta con otra.');
                backgroundImageInput.value = '';
                fileNameSpan.textContent = 'Seleccionar imagen...';
            }
        }
    });

    // Handle opacity slider
    opacitySlider.addEventListener('input', (e) => {
        const value = e.target.value;
        opacityValue.textContent = value;
        imageOpacity = value / 100;
    });

    // Clear background image
    clearImageBtn.addEventListener('click', () => {
        backgroundImageData = null;
        backgroundImageInput.value = '';
        fileNameSpan.textContent = 'Seleccionar imagen...';
        clearImageBtn.classList.add('hidden');
        opacityControl.classList.add('hidden');
    });

    // Generate PDF button click handler
    generateBtn.addEventListener('click', async () => {
        const start = parseInt(startNumberInput.value) || 1;
        const end = parseInt(endNumberInput.value) || 300;
        const perPage = parseInt(perPageInput.value) || 50;
        const columns = parseInt(columnsInput.value) || 5;
        const ticketText = ticketTextInput.value.trim();

        // Validate inputs
        if (start > end) {
            alert('El número inicial debe ser menor o igual al número final');
            return;
        }

        if (start < 1 || end > 99999) {
            alert('Los números deben estar entre 1 y 99.999');
            return;
        }

        // Disable button and show progress
        generateBtn.disabled = true;
        progressContainer.classList.remove('hidden');
        progressFill.style.width = '0%';
        progressText.textContent = 'Generando PDF...';

        try {
            await generatePDF(start, end, perPage, columns, ticketText, backgroundImageData, imageOpacity, (progress) => {
                progressFill.style.width = `${progress}%`;
                progressText.textContent = `Generando PDF... ${Math.round(progress)}%`;
            });

            progressFill.style.width = '100%';
            progressText.textContent = '¡PDF generado exitosamente!';

            // Hide progress after 2 seconds
            setTimeout(() => {
                progressContainer.classList.add('hidden');
            }, 2000);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error al generar el PDF. Por favor, intenta de nuevo.');
            progressContainer.classList.add('hidden');
        } finally {
            generateBtn.disabled = false;
        }
    });

    // Initial stats update
    updateStats();
}

// ===========================
// PDF Generation Logic
// ===========================

// Helper function to read image file
function readImageFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Calculate number of digits needed based on max number
function getDigitsCount(maxNumber) {
    return maxNumber.toString().length;
}

async function generatePDF(start, end, perPage, columns, ticketText, backgroundImage, imageOpacity, onProgress) {
    // Check if jsPDF is loaded
    if (typeof window.jspdf === 'undefined') {
        throw new Error('jsPDF library not loaded. Please refresh the page.');
    }

    const { jsPDF } = window.jspdf;

    if (!jsPDF) {
        throw new Error('jsPDF constructor not found. Please refresh the page.');
    }

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // A4 dimensions in mm
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const usableWidth = pageWidth - (2 * margin);
    const usableHeight = pageHeight - (2 * margin);

    // Calculate ticket dimensions
    const ticketWidth = usableWidth / columns;
    const rows = Math.ceil(perPage / columns);
    const ticketHeight = usableHeight / rows;

    let currentTicket = 0;
    const totalTickets = end - start + 1;
    let isFirstPage = true;

    for (let num = start; num <= end; num++) {
        const ticketIndex = currentTicket % perPage;

        // Add new page if needed
        if (ticketIndex === 0 && !isFirstPage) {
            pdf.addPage();
        }
        isFirstPage = false;

        // Calculate position
        const col = ticketIndex % columns;
        const row = Math.floor(ticketIndex / columns);
        const x = margin + (col * ticketWidth);
        const y = margin + (row * ticketHeight);

        // Draw ticket
        await drawTicket(pdf, x, y, ticketWidth, ticketHeight, num, ticketText, backgroundImage, imageOpacity, end);

        currentTicket++;

        // Update progress
        if (onProgress) {
            const progress = (currentTicket / totalTickets) * 100;
            onProgress(progress);
        }

        // Allow UI to update
        if (currentTicket % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    // Save the PDF
    const fileName = `entradas_${start}-${end}.pdf`;
    pdf.save(fileName);
}

function drawTicket(pdf, x, y, width, height, number, ticketText, backgroundImage, imageOpacity, maxNumber) {
    // Calculate digits needed based on max number
    const digitsNeeded = getDigitsCount(maxNumber);

    // Format number with dynamic leading zeros
    const formattedNumber = String(number).padStart(digitsNeeded, '0');

    // Draw background image if provided
    if (backgroundImage) {
        try {
            // Save the current graphics state
            pdf.saveGraphicsState();
            // Set the opacity (alpha)
            pdf.setGState(new pdf.GState({ opacity: imageOpacity }));
            // Add the image
            pdf.addImage(backgroundImage, 'PNG', x, y, width, height);
            // Restore the graphics state to reset opacity
            pdf.restoreGraphicsState();
        } catch (error) {
            console.warn('Could not add background image:', error);
        }
    }

    // Draw border
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.2);
    pdf.rect(x, y, width, height);

    // Set font for ticket text
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);

    // Draw ticket text if provided
    if (ticketText) {
        const textWidth = pdf.getTextWidth(ticketText);
        pdf.text(ticketText, x + (width / 2) - (textWidth / 2), y + height * 0.35);
    }

    // Set font for number
    pdf.setFontSize(16);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0, 0, 0);

    // Draw number centered
    const numberWidth = pdf.getTextWidth(formattedNumber);
    const numberX = x + (width / 2) - (numberWidth / 2);
    const numberY = ticketText ? y + height * 0.6 : y + height * 0.55;
    pdf.text(formattedNumber, numberX, numberY);

    // Reset font
    pdf.setFont(undefined, 'normal');
}

// ===========================
// Utility Functions
// ===========================

// Add smooth scroll behavior
document.documentElement.style.scrollBehavior = 'smooth';

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to generate PDF
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('generate-btn').click();
    }
});
