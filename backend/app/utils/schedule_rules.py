from datetime import datetime, timedelta, timezone

ATELIER_TIMEZONE = timezone(timedelta(hours=-3))

SLOT_MINUTES = 30
LUNCH_BLOCK_MINUTES = {660, 690, 720, 750, 780, 810}
SATURDAY_SLOT_MINUTES = {840, 870, 900, 930, 960}
BASE_WEEKDAY_SLOT_MINUTES = {
    480,
    510,
    540,
    570,
    600,
    630,
    840,
    870,
    900,
    930,
    960,
    990,
    1020,
}
EXTENDED_SLOT_MINUTES = {1050, 1080, 1110, 1140}
EXTENDED_WEEKDAYS = {1, 3, 4}


def to_atelier_datetime(date_time: datetime) -> datetime:
    if date_time.tzinfo is None:
        return date_time
    return date_time.astimezone(ATELIER_TIMEZONE)


def minute_of_day(date_time: datetime) -> int:
    return date_time.hour * 60 + date_time.minute


def slot_time_from_minutes(minutes: int) -> tuple[int, int]:
    return divmod(minutes, 60)


def allowed_hours_for_date(date_time: datetime) -> set[int]:
    atelier_date_time = to_atelier_datetime(date_time)
    weekday = atelier_date_time.weekday()
    if weekday == 6:
        return set()
    if weekday == 5:
        return set(SATURDAY_SLOT_MINUTES)

    slots = set(BASE_WEEKDAY_SLOT_MINUTES)
    if weekday in EXTENDED_WEEKDAYS:
        slots.update(EXTENDED_SLOT_MINUTES)

    return slots - LUNCH_BLOCK_MINUTES


def is_allowed_slot_start(starts_at: datetime) -> bool:
    atelier_starts_at = to_atelier_datetime(starts_at)
    return minute_of_day(atelier_starts_at) in allowed_hours_for_date(atelier_starts_at)
