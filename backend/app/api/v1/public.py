from fastapi import APIRouter

router = APIRouter()


@router.get("/help")
def public_help() -> dict:
    return {
        "title": "Ayuda",
        "sections": [
            {
                "title": "Que es Viru",
                "body": "Viru es tu panel para seguir rutas, alertas y oportunidades de vuelo sin ruido.",
            },
            {
                "title": "Preguntas frecuentes",
                "body": "Puedes crear una cuenta gratis para activar alertas y guardar tus rutas favoritas.",
            },
            {
                "title": "Soporte",
                "body": "Si ya tienes cuenta, entra al panel para reportar incidencias o enviar sugerencias. El tiempo de respuesta puede variar segun volumen.",
            },
        ],
    }
