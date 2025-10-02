const loadImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
});

export const createAlbum = async (generations: { decade: string, url: string }[], format: 'image/jpeg' | 'image/png'): Promise<string> => {
    const canvas = document.createElement('canvas');
    // A4 aspect ratio at 300 DPI
    const canvasWidth = 2480;
    const canvasHeight = 3508;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    // Background
    ctx.fillStyle = '#F5F5DC'; // beige
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 150px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Past Forward', canvasWidth / 2, 250);

    const images = await Promise.all(generations.map(g => loadImage(g.url)));
    
    const padding = 150;
    const gridWidth = canvasWidth - (padding * 2);
    const numCols = 2;
    const numRows = Math.ceil(images.length / numCols);
    const cellWidth = gridWidth / numCols;
    const cellHeight = (canvasHeight - 400 - padding) / numRows;
    const imageMaxWidth = cellWidth * 0.7;
    const imageMaxHeight = cellHeight * 0.7;

    generations.forEach(({ decade }, index) => {
        const img = images[index];
        const row = Math.floor(index / numCols);
        const col = index % numCols;

        const aspectRatio = img.width / img.height;
        let drawWidth = imageMaxWidth;
        let drawHeight = drawWidth / aspectRatio;

        if (drawHeight > imageMaxHeight) {
            drawHeight = imageMaxHeight;
            drawWidth = drawHeight * aspectRatio;
        }

        const cellX = padding + col * cellWidth;
        const cellY = 400 + row * cellHeight;
        const centerX = cellX + cellWidth / 2;
        const centerY = cellY + cellHeight / 2;

        ctx.save();
        ctx.translate(centerX, centerY);
        const rotation = (Math.random() - 0.5) * 0.2; // random rotation in radians
        ctx.rotate(rotation);
        
        // Polaroid effect
        const framePadding = 30;
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 10;
        ctx.fillRect(-(drawWidth/2) - framePadding, -(drawHeight/2) - framePadding, drawWidth + framePadding*2, drawHeight + framePadding*2 + 80);
        ctx.shadowColor = 'transparent'; // reset shadow for image and text

        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        
        ctx.fillStyle = '#555';
        ctx.font = '60px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(decade, 0, drawHeight / 2 + 60);

        ctx.restore();
    });

    if (format === 'image/jpeg') {
        return canvas.toDataURL('image/jpeg', 0.9);
    }
    return canvas.toDataURL('image/png');
};