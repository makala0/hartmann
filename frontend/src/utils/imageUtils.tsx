import {useState} from "react";

const API_BASE_URL = 'http://localhost:8080/api';

/**
 * Převede cestu z databáze na URL pro frontend
 * @param imagePath - cesta z databáze (např. "/static/images/sample_s1.png")
 * @returns URL pro frontend (např. "http://localhost:8080/api/images/sample_s1.png")
 */
export const getImageUrl = (imagePath: string | null | undefined): string | null => {
    if (!imagePath || imagePath === 'N/A' || imagePath.trim() === '') {
        return null;
    }

    // Extrakt názvu souboru z cesty
    const fileName = imagePath.split('/').pop();

    if (!fileName) {
        return null;
    }

    return `${API_BASE_URL}/images/${fileName}`;
};

/**
 * Ověří, zda je obrázek dostupný
 * @param imagePath - cesta z databáze
 * @returns Promise<boolean>
 */
export const checkImageExists = async (imagePath: string): Promise<boolean> => {
    try {
        const fileName = imagePath.split('/').pop();
        if (!fileName) return false;

        const response = await fetch(`${API_BASE_URL}/images/check/${fileName}`);
        const data = await response.json();
        return data.exists;
    } catch (error) {
        console.error('Error checking image:', error);
        return false;
    }
};

/**
 * Komponenta pro zobrazení obrázku s fallback
 */
export const ImageWithFallback: React.FC<{
    src: string | null;
    alt: string;
    style?: React.CSSProperties;
    fallback?: React.ReactNode;
}> = ({ src, alt, style, fallback }) => {
    const [imageError, setImageError] = useState(false);
    const [loading, setLoading] = useState(true);

    const handleLoad = () => {
        setLoading(false);
        setImageError(false);
    };

    const handleError = () => {
        setLoading(false);
        setImageError(true);
    };

    if (!src || imageError) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fafafa',
                border: '2px dashed #d9d9d9',
                borderRadius: '6px',
                ...style
            }}>
                {fallback || <div style={{ color: '#999', textAlign: 'center' }}>Obrázek nedostupný</div>}
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', ...style }}>
            {loading && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f0f0f0'
                }}>
                    Načítání...
                </div>
            )}
            <img
                src={src}
                alt={alt}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onLoad={handleLoad}
                onError={handleError}
            />
        </div>
    );
};