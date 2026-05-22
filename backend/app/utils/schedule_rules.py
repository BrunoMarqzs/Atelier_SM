from datetime import datetime, timedelta, timezone

ATELIER_TIMEZONE = timezone(timedelta(hours=-3))

LUNCH_BLOCK_HOURS = {11, 12, 13}
SATURDAY_HOURS = {14, 15, 16}
BASE_WEEKDAY_HOURS = {8, 9, 10, 14, 15, 16, 17}
EXTENDED_WEEKDAYS = {1, 3, 4}


def to_atelier_datetime(date_time: datetime) -> datetime:
    if date_time.tzinfo is None:
        return date_time
    return date_time.astimezone(ATELIER_TIMEZONE)


def allowed_hours_for_date(date_time: datetime) -> set[int]:
    atelier_date_time = to_atelier_datetime(date_time)
    weekday = atelier_date_time.weekday()
    if weekday == 6:
        return set()
    if weekday == 5:
        return set(SATURDAY_HOURS)

    hours = set(BASE_WEEKDAY_HOURS)
    if weekday in EXTENDED_WEEKDAYS:
        hours.update({18, 19})

    return hours - LUNCH_BLOCK_HOURS


def is_allowed_slot_start(starts_at: datetime) -> bool:
    atelier_starts_at = to_atelier_datetime(starts_at)
    return atelier_starts_at.hour in allowed_hours_for_date(atelier_starts_at)
