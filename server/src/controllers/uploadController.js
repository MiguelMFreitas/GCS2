export function uploadFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    return res.json({
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      message: 'Arquivo enviado com sucesso.'
    });
  } catch (err) {
    console.error('Erro no upload:', err);
    return res.status(500).json({ error: 'Falha ao processar upload do arquivo.' });
  }
}
