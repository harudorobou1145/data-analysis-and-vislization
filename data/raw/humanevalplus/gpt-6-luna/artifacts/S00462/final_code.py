def circular_shift(x, shift):
    """Circularly shift the digits of ``x`` to the right by ``shift`` places.

    If ``shift`` is greater than the number of digits, return the digits in
    reverse order instead.

    >>> circular_shift(12, 1)
    '21'
    >>> circular_shift(12, 2)
    '12'
    """
    digits = str(x)
    if shift > len(digits):
        return digits[::-1]
    if shift == 0:
        return digits
    return digits[-shift:] + digits[:-shift]
