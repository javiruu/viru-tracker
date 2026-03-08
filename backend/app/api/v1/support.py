from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.domain.schemas import FeedbackIn
from app.infrastructure.db.models import SupportFeedback, User
from app.infrastructure.db.session import get_db

router = APIRouter()


def help_payload() -> dict:
    return {
        "title": "Centro de ayuda",
        "status": {"state": "ok", "message": "Estado reportado por backend"},
        "sections": [
            {
                "title": "Como funciona Viru",
                "body": "Viru te ayuda a seguir rutas y encontrar vuelos con alertas inteligentes y filtros reales.",
            },
            {
                "title": "FAQ rapidas",
                "body": "Puedes ajustar preferencias, pausar alertas o reiniciar tu busqueda desde tu panel.",
            },
            {
                "title": "Estado del sistema",
                "body": "Mostramos el estado operativo reportado por el backend en el momento de la consulta. Si hay degradacion de proveedor, se refleja en alertas y mensajes de frescura.",
            },
            {
                "title": "Contacto",
                "body": "Si necesitas ayuda directa, escribe a soporte y te respondemos lo antes posible.",
            },
        ],
    }


@router.get("/help")
def get_help(current_user: User = Depends(get_current_user)) -> dict:
    _ = current_user
    return help_payload()


@router.post("/feedback")
def submit_feedback(
    payload: FeedbackIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    db.add(
        SupportFeedback(
            user_id=current_user.id,
            feedback_type=payload.feedback_type,
            message=payload.message,
            attachment_url=payload.attachment_url,
        )
    )
    db.commit()
    return {"status": "ok"}
