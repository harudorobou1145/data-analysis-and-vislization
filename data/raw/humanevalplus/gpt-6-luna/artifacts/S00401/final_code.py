def hex_key(num):
    """Count hexadecimal digits whose numeric values are prime.

    Prime-valued hexadecimal digits are 2, 3, 5, 7, B (11), and D (13).
    The input is a valid hexadecimal string, or the empty string; letter
    digits are uppercase.
    """
    prime_digits = {"2", "3", "5", "7", "B", "D"}
    return sum(digit in prime_digits for digit in num)
