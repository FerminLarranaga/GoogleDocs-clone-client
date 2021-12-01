import React, { useCallback, useEffect, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import './styles.css';
import { io } from 'socket.io-client';
import { useParams } from 'react-router';

// Personalizar las opciones de la toolbar
const TOOLBAR_OPTIONS = [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['bold', 'italic', 'underlined'],
    [{ color: [] }, { background: [] }],
    [{ script: 'sub' }, { script: 'super' }],
    [{ align: [] }],
    ['image', 'blockquote', 'code-block'],
    ['clean']
];

const SAVE_INTERVAL_MS = 2000;

export default function TextEditor() {
    // Obtener el id del coumento usando los parametros del link
    const {id: documentId} = useParams();

    const [socket,  setSocket] = useState();
    const [quill,  setQuill] = useState();

    // Obtener el socket del servidos
    useEffect(() => {
        // Conectarse al servidor
        const s = io('https://googledocs-clone-server.herokuapp.com');
        setSocket(s);

        return () => {
            s.disconnect();
        }
    }, []);

    // Cargar el documento desde el servidor
    useEffect(() => {
        if (socket == null || quill == null) return

        socket.once('load-document', document => {
            quill.setContents(document);
            quill.enable();
        });

        socket.emit('get-document', documentId);

    }, [socket,  quill, documentId]);

    // Recivir cambios si los hay
    useEffect(() => {
        if (socket == null || quill == null) return

        // Actualizar el contenido del doc con los cambios recibidos del servidor
        const handler = (delta) => {
            quill.updateContents(delta);
        }

        // Si se hizo algun cambio, el servidor automaticamente ejecutara la funcion handler
        socket.on('recieve-changes', handler);

        return () => {
            socket.off('recieve-changes', handler);
        }
    }, [socket, quill]);

    // Enviar cambios al servidor si el usuario realizo alguno
    useEffect(() => {
        if (socket == null || quill == null) return

        // Enviar cambios
        const handler = (delta, oldDelta, source) => {
            if (source !== 'user') return
            socket.emit('send-changes', delta);
        }
        // Si algun cambio fue realizado se ejecutara el handler
        quill.on('text-change', handler);

        return () => {
            quill.off('text-change', handler);
        }
    }, [socket, quill]);

    // Guardar doc cada 2 secs
    useEffect(() => {
        if (socket == null || quill == null) return
        
        const saving_interval = setInterval(() => {
            socket.emit('save-document', quill.getContents());
        }, SAVE_INTERVAL_MS);

        return () => {
            clearInterval(saving_interval);
        }
    }, [socket, quill]);

    // Adaptando Quill a React
    const wrapperRef = useCallback(wrapper => {
        if (wrapper == null) return
        wrapper.innerHTML = '';
        const editor = document.createElement('div');
        wrapper.append(editor);

        const q = new Quill(editor, { theme: "snow", modules: { toolbar: TOOLBAR_OPTIONS }});
        q.disable();
        q.setText('Cargando...');
        setQuill(q);
    }, []);

    return (
        <div className='container' ref={wrapperRef}></div>
    );
}