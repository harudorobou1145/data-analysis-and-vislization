def valid_date(date):
    """Return whether *date* is a valid date in ``mm-dd-yyyy`` format.

    Months have their usual maximum day counts, except February is allowed
    up to 29 days regardless of the year (as specified by this exercise).
    """
    if not isinstance(date, str) or len(date) != 10:
        return False
    if date[2] != "-" or date[5] != "-":
        return False

    month_text = date[:2]
    day_text = date[3:5]
    year_text = date[6:]
    if not (month_text.isascii() and month_text.isdigit() and
            day_text.isascii() and day_text.isdigit() and
            year_text.isascii() and year_text.isdigit()):
        return False

    month = int(month_text)
    day = int(day_text)
    if month < 1 or month > 12 or day < 1:
        return False

    if month in (1, 3, 5, 7, 8, 10, 12):
        maximum_day = 31
    elif month in (4, 6, 9, 11):
        maximum_day = 30
    else:
        maximum_day = 29
    return day <= maximum_day
