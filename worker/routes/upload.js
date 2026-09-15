// Cloudflare R2 File Upload and Retrieval Controller

export async function uploadFile(request, env) {
  try {
    if (!env.BUCKET) {
      return Response.json({ error: 'Cloudflare R2 bucket binding (env.BUCKET) não configurado.' }, { status: 500 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return Response.json({ error: 'Formato inválido. Envie como multipart/form-data.' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return Response.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const originalName = file.name || 'document';
    const ext = originalName.includes('.') ? originalName.split('.').pop().toLowerCase() : 'bin';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const fileMime = file.type || 'application/octet-stream';

    const arrayBuffer = await file.arrayBuffer();

    // Store in Cloudflare R2 Bucket
    await env.BUCKET.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: fileMime,
        contentDisposition: `inline; filename="${originalName}"`
      },
      customMetadata: {
        originalName,
        uploadedAt: new Date().toISOString()
      }
    });

    const fileUrl = `/uploads/${filename}`;

    return Response.json({
      url: fileUrl,
      filename,
      originalName,
      size: file.size,
      mimetype: fileMime,
      storage: 'cloudflare-r2',
      message: 'Arquivo salvo permanentemente no Cloudflare R2 com sucesso.'
    }, { status: 201 });
  } catch (err) {
    console.error('Erro no upload para o R2:', err);
    return Response.json({ error: 'Falha ao processar upload do arquivo no Cloudflare R2.' }, { status: 500 });
  }
}

export async function serveFile(request, env, filename) {
  try {
    if (!env.BUCKET) {
      return new Response('Cloudflare R2 Bucket não configurado.', { status: 500 });
    }

    const cleanFilename = decodeURIComponent(filename).replace(/^(\.\.[\/\\])+/, '');
    const object = await env.BUCKET.get(cleanFilename);

    if (!object) {
      return new Response('Arquivo não encontrado no Cloudflare R2.', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(object.body, {
      headers
    });
  } catch (err) {
    console.error('Erro ao servir arquivo do R2:', err);
    return new Response('Erro ao recuperar arquivo.', { status: 500 });
  }
}
