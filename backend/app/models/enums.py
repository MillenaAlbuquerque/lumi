import enum


class UserRole(str, enum.Enum):
    ORGANIZER = "ORGANIZER"
    CLIENT = "CLIENT"
    GATEKEEPER = "GATEKEEPER"


class SeatType(str, enum.Enum):
    standard = "standard"
    vip = "vip"
    accessible = "accessible"


class ReservationStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"


class TicketStatus(str, enum.Enum):
    issued = "issued"
    used = "used"
    cancelled = "cancelled"
