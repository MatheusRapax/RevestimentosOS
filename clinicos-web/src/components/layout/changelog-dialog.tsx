'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, X } from 'lucide-react';
import latestRelease from '@/data/latest-release.json';

export function ChangelogDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [version, setVersion] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        try {
            const data = latestRelease || { version: '0.0.0', content: '' };
            if (!data.version) return;

            const storedVersion = localStorage.getItem('moa_last_seen_version');
            if (storedVersion !== data.version && data.content) {
                setVersion(data.version);
                setContent(data.content);
                setIsOpen(true);
            }
        } catch (error) {
            console.error('Failed to parse latest release data', error);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        try {
            localStorage.setItem('moa_last_seen_version', version);
        } catch (e) {
            console.error('Failed to set localStorage', e);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) handleClose();
        }}>
            <DialogContent className="sm:max-w-[500px] h-[70vh] flex flex-col pt-8">
                <button
                    onClick={handleClose}
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Fechar</span>
                </button>
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <DialogTitle className="text-xl">Novidades da Versão {version}</DialogTitle>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-2 prose-ul:my-2 prose-li:my-1">
                        <ReactMarkdown>
                            {content}
                        </ReactMarkdown>
                    </div>
                </div>

                <DialogFooter className="mt-4 border-t pt-4">
                    <Button onClick={handleClose} className="w-full">
                        Entendi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
