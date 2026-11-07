import re


def valid_date(date):
    """Validate a date string in the format ``mm-dd-yyyy``.

    The month must be between 1 and 12, and the day must be valid for
    the given month. February permits up to 29 days, as specified.
    """
    if not isinstance(date, str):
        return False

    match = re.fullmatch(r"([0-9]{2})-([0-9]{2})-([0-9]{4})", date)
    if match is None:
        return False

    month = int(match.group(1))
    day = int(match.group(2))

    if not 1 <= month <= 12 or day < 1:
        return False

    if month in {1, 3, 5, 7, 8, 10, 12}:
        return day <= 31
    if month in {4, 6, 9, 11}:
        return day <= 30
    return day <= 29
