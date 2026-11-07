import math


def find_zero(xs: list):
    """Return a real zero of an odd-degree polynomial.

    >>> round(find_zero([1, 2]), 2)
    -0.5
    >>> round(find_zero([-6, 11, -6, 1]), 2)
    1.0
    """
    import math
    import operator
    from decimal import Decimal, localcontext

    coefficients = []
    for coefficient in xs:
        try:
            # Integer scalar types need not be Python ints. Converting them
            # also prevents fixed-width overflow in abs() and multiplication.
            coefficient = operator.index(coefficient)
        except TypeError:
            pass
        coefficients.append(coefficient)
    while coefficients and coefficients[-1] == 0:
        coefficients.pop()
    if not coefficients:
        return 0.0
    if len(coefficients) == 1:
        raise ValueError("A nonconstant polynomial is required")

    degree = len(coefficients) - 1
    precision = max(80, 20 * degree)
    def as_decimal(coefficient):
        try:
            return Decimal(coefficient)
        except TypeError:
            # Fractions and floating-point scalar types expose their exact
            # rational value even when Decimal cannot consume them directly.
            try:
                numerator, denominator = coefficient.as_integer_ratio()
            except AttributeError:
                return Decimal(float(coefficient))
            with localcontext() as context:
                context.prec = precision
                return Decimal(int(numerator)) / Decimal(int(denominator))

    exact = [as_decimal(c) for c in coefficients]

    def precise_value(x):
        with localcontext() as context:
            context.prec = precision
            point = Decimal(x)
            value = exact[-1]
            for coefficient in reversed(exact[:-1]):
                value = value * point + coefficient
            return value

    # Power-of-two scaling is exact unless a coefficient underflows. In that
    # case use Decimal throughout, retaining even extremely small terms.
    scale = max(abs(c) for c in coefficients)
    try:
        exponent = math.frexp(scale)[1]
        normalized = [math.ldexp(c, -exponent) for c in coefficients]
        use_precise = any(c != 0 and (n == 0 or abs(n) < 2.2250738585072014e-308)
                          for c, n in zip(coefficients, normalized))
    except (OverflowError, TypeError):
        normalized = []
        use_precise = True

    def sign(x):
        if not use_precise:
            # Outside the unit interval, evaluate p(x)/x**degree. Reversing
            # Horner's recurrence avoids overflowing intermediate powers.
            if abs(x) > 1:
                point = 1 / x
                ordered = normalized
            else:
                point = x
                ordered = reversed(normalized)
            iterator = iter(ordered)
            value = next(iterator)
            magnitude = abs(value)
            for coefficient in iterator:
                value = value * point + coefficient
                magnitude = magnitude * abs(point) + abs(coefficient)
            if abs(value) > magnitude * (degree + 1) * 2e-15:
                result = 1 if value > 0 else -1
                if abs(x) > 1 and x < 0 and degree % 2:
                    result = -result
                return result
        # A rounded zero, or a sum dominated by cancellation, cannot safely
        # determine which half of the bracket contains a root.
        value = precise_value(x)
        return (value > 0) - (value < 0)

    def residual(x):
        try:
            value = abs(sum(c * math.pow(x, i)
                            for i, c in enumerate(coefficients)))
            if math.isfinite(value):
                return (0, value, abs(precise_value(x)))
        except (OverflowError, TypeError):
            pass
        return (1, abs(precise_value(x)), 0)

    def best_float(left, right):
        candidates = {left, right}
        for endpoint in (left, right):
            candidates.add(math.nextafter(endpoint, -math.inf))
            candidates.add(math.nextafter(endpoint, math.inf))
        return min((x for x in candidates if math.isfinite(x)), key=residual)

    if degree == 1:
        with localcontext() as context:
            context.prec = precision
            root = float(-exact[0] / exact[1])
        return best_float(root, root)

    def finish(root):
        quality = residual(root)
        if quality[0] or quality[1] <= 1e-7:
            return root

        # Sampling can miss an even number of roots between adjacent points.
        # Critical points partition a polynomial into monotone intervals, so
        # recursively isolating derivative roots recovers those missed roots.
        bound = abs(root)
        with localcontext() as context:
            context.prec = precision

            def value(cs, point):
                x = Decimal(point)
                result = cs[-1]
                for c in reversed(cs[:-1]):
                    result = result * x + c
                return result

            def isolate(cs):
                if len(cs) == 2:
                    point = float(-cs[0] / cs[1])
                    return [point] if -bound <= point <= bound else []
                derivative = [i * cs[i] for i in range(1, len(cs))]
                points = [-bound] + isolate(derivative) + [bound]
                roots = []
                left = points[0]
                left_value = value(cs, left)
                if left_value == 0:
                    roots.append(left)
                for right in points[1:]:
                    right_value = value(cs, right)
                    if right_value == 0:
                        roots.append(right)
                    if left_value != 0 and right_value != 0 and ((left_value < 0) != (right_value < 0)):
                        a, b, va = left, right, left_value
                        while True:
                            middle = a / 2 + b / 2
                            if middle == a or middle == b:
                                roots.append(min((a, b), key=lambda x: abs(value(cs, x))))
                                break
                            vm = value(cs, middle)
                            if vm == 0:
                                roots.append(middle)
                                break
                            if (vm < 0) == (va < 0):
                                a, va = middle, vm
                            else:
                                b = middle
                    left, left_value = right, right_value
                return sorted(set(roots))

            candidates = [root]
            for point in isolate(exact):
                candidates.append(best_float(point, point))
            return min(candidates, key=residual)

    def bisect(left, right, left_sign):
        while True:
            middle = left / 2 + right / 2
            if middle == left or middle == right:
                return best_float(left, right)
            middle_sign = sign(middle)
            if middle_sign == left_sign:
                left = middle
            else:
                right = middle

    # Odd degree guarantees opposite signs at sufficiently distant ends.
    # Keep a zero at the right endpoint in the interval: there may also be
    # roots inside it. A zero at the left endpoint is already the limiting
    # result of this bisection convention.
    radius = 1.0
    largest_float = float.fromhex('0x1.fffffffffffffp+1023')
    while True:
        left, right = -radius, radius
        left_sign, right_sign = sign(left), sign(right)
        if left_sign == 0:
            return finish(best_float(left, left))
        if right_sign == 0 or left_sign != right_sign:
            return finish(bisect(left, right, left_sign))
        if radius == largest_float:
            break
        radius = min(radius * 2, largest_float)
    raise ValueError("No real root could be bracketed in the finite float range")



def poly(xs: list, x: float):
    """Evaluate a polynomial whose coefficients are in ascending order."""
    return sum(coeff * math.pow(x, i) for i, coeff in enumerate(xs))
