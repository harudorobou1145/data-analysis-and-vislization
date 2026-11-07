import math
from fractions import Fraction


def poly(xs: list, x: float):
    """Evaluate a polynomial whose coefficients are ordered by degree."""
    value = 0
    for coefficient in reversed(xs):
        value = value * x + coefficient
    return value


def find_zero(xs: list):
    """Find a real zero of a polynomial with ascending-order coefficients."""
    if not xs:
        raise ValueError("xs must contain polynomial coefficients")

    # Remove zero padding while retaining the represented polynomial.
    last = len(xs) - 1
    while last >= 0 and xs[last] == 0:
        last -= 1
    if last < 0:
        return 0.0

    coefficients = [Fraction(c) for c in xs[:last + 1]]

    def sign_at(x):
        # Exact Horner evaluation at a float's exact binary value prevents
        # overflow and makes the bisection's sign decisions reliable.
        xx = Fraction.from_float(x)
        value = coefficients[-1]
        for coefficient in reversed(coefficients[:-1]):
            value = value * xx + coefficient
        return (value > 0) - (value < 0)

    sign_zero = sign_at(0.0)
    if sign_zero == 0:
        return 0.0

    # Expand on both sides until we find a sign-changing interval. This works
    # for the guaranteed odd-degree case, and also many even-degree inputs.
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

    # Keep the opposite-sign endpoints invariant until float precision is met.
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
