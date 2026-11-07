import math
from fractions import Fraction


def poly(xs: list, x: float):
    """Evaluate xs[0] + xs[1] * x + ... + xs[n] * x**n."""
    return sum([coefficient * math.pow(x, i) for i, coefficient in enumerate(xs)])


def find_zero(xs: list):
    """Return a real zero of a polynomial with ascending-order coefficients."""
    last = len(xs) - 1
    while last >= 0 and xs[last] == 0:
        last -= 1
    if last < 0:
        return 0.0

    coefficients = [Fraction(c) for c in xs[:last + 1]]

    def value_at(x):
        xx = Fraction.from_float(x)
        value = coefficients[-1]
        for coefficient in reversed(coefficients[:-1]):
            value = value * xx + coefficient
        return value

    def sign_at(x):
        value = value_at(x)
        return (value > 0) - (value < 0)

    sign_zero = sign_at(0.0)
    if sign_zero == 0:
        return 0.0

    # For an even-degree polynomial, a real root can touch zero without a
    # sign change. Check its real critical point for a repeated root.
    if last % 2 == 0 and last > 0:
        derivative = [i * coefficients[i] for i in range(1, len(coefficients))]
        critical = find_zero(derivative)
        critical_value = value_at(critical)
        xc = Fraction.from_float(critical)
        scale = sum(abs(c) * abs(xc) ** i for i, c in enumerate(coefficients))
        if critical_value == 0 or (scale and abs(critical_value) <= scale / 10**14):
            return critical

    max_float = float.fromhex("0x1.fffffffffffffp+1023")
    bound = 1.0
    while True:
        for endpoint in (bound, -bound):
            endpoint_sign = sign_at(endpoint)
            if endpoint_sign == 0:
                return endpoint
            if endpoint_sign != sign_zero:
                lo, hi = sorted((0.0, endpoint))
                lo_sign = sign_zero if endpoint > 0 else endpoint_sign
                break
        else:
            if bound == max_float:
                raise ValueError("no representable sign-changing root found")
            bound = min(bound * 2.0, max_float)
            continue
        break

    for _ in range(1100):
        mid = lo + (hi - lo) / 2.0
        if mid == lo or mid == hi:
            return mid
        mid_sign = sign_at(mid)
        if mid_sign == 0:
            return mid
        if mid_sign == lo_sign:
            lo, lo_sign = mid, mid_sign
        else:
            hi = mid
    return lo + (hi - lo) / 2.0
